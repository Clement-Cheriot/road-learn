package com.roadlearn.app

import android.media.MediaPlayer
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import ai.onnxruntime.*
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min

/**
 * Plugin Capacitor pour Piper TTS avec ONNX Runtime
 * Synthèse vocale offline de haute qualité
 */
@CapacitorPlugin(name = "PiperTTS")
class PiperTTSPlugin : Plugin() {
    private var ortSession: OrtSession? = null
    private var ortEnv: OrtEnvironment? = null
    private var modelConfig: JSONObject? = null
    private var mediaPlayer: MediaPlayer? = null

    /**
     * Initialise le modèle Piper ONNX
     */
    @PluginMethod
    fun initialize(call: PluginCall) {
        val modelPath = call.getString("modelPath")
        val configPath = call.getString("configPath")

        if (modelPath == null || configPath == null) {
            call.reject("Missing modelPath or configPath")
            return
        }

        Thread {
            try {
                // Charger la configuration JSON depuis les assets
                val configInputStream = context.assets.open(configPath)
                val configString = configInputStream.bufferedReader().use { it.readText() }
                modelConfig = JSONObject(configString)

                // Initialiser ONNX Runtime
                ortEnv = OrtEnvironment.getEnvironment()
                val sessionOptions = OrtSession.SessionOptions().apply {
                    setIntraOpNumThreads(2)
                    setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
                }

                // Charger le modèle depuis les assets
                val modelInputStream = context.assets.open(modelPath)
                val modelBytes = modelInputStream.readBytes()

                ortSession = ortEnv!!.createSession(modelBytes, sessionOptions)

                activity.runOnUiThread {
                    call.resolve(mapOf("initialized" to true))
                }
            } catch (e: Exception) {
                activity.runOnUiThread {
                    call.reject("Failed to initialize Piper: ${e.message}", e)
                }
            }
        }.start()
    }

    /**
     * Synthétise le texte et joue l'audio
     */
    @PluginMethod
    fun speak(call: PluginCall) {
        val text = call.getString("text")
        if (text == null) {
            call.reject("Missing text parameter")
            return
        }

        val rate = call.getFloat("rate") ?: 1.0f
        val pitch = call.getFloat("pitch") ?: 1.0f
        val volume = call.getFloat("volume") ?: 1.0f

        Thread {
            try {
                // 1. Convertir le texte en phonèmes
                val phonemes = textToPhonemes(text)

                // 2. Générer l'audio via ONNX
                val audioData = generateAudio(phonemes, rate, pitch)

                // 3. Sauvegarder en WAV temporaire
                val tempFile = File.createTempFile("piper_output", ".wav", context.cacheDir)
                saveWAV(audioData, tempFile)

                // 4. Jouer l'audio
                activity.runOnUiThread {
                    try {
                        mediaPlayer?.release()
                        mediaPlayer = MediaPlayer().apply {
                            setDataSource(tempFile.absolutePath)
                            setVolume(volume, volume)
                            setOnCompletionListener {
                                notifyListeners("onSpeechEnd", mapOf("success" to true))
                            }
                            setOnErrorListener { _, what, extra ->
                                notifyListeners("onSpeechError", mapOf(
                                    "error" to "MediaPlayer error: what=$what, extra=$extra"
                                ))
                                true
                            }
                            prepare()
                            start()
                        }

                        call.resolve(mapOf("playing" to true))
                    } catch (e: Exception) {
                        call.reject("Failed to play audio: ${e.message}", e)
                    }
                }
            } catch (e: Exception) {
                activity.runOnUiThread {
                    call.reject("Failed to synthesize speech: ${e.message}", e)
                }
            }
        }.start()
    }

    /**
     * Arrête la lecture audio
     */
    @PluginMethod
    fun stop(call: PluginCall) {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        call.resolve()
    }

    // MARK: - Private Methods

    /**
     * Convertit le texte en IDs de phonèmes
     */
    private fun textToPhonemes(text: String): LongArray {
        val phonemeMap = modelConfig?.getJSONObject("phoneme_id_map")
            ?: throw IllegalStateException("Missing phoneme_id_map in config")

        // Normalisation du texte
        val normalized = text.lowercase()
            .replace(Regex("[àáâãäå]"), "a")
            .replace(Regex("[èéêë]"), "e")
            .replace(Regex("[ìíîï]"), "i")
            .replace(Regex("[òóôõö]"), "o")
            .replace(Regex("[ùúûü]"), "u")
            .replace(Regex("[ç]"), "c")

        // Conversion en IDs
        val phonemeIds = mutableListOf<Long>()
        for (char in normalized) {
            val charStr = char.toString()
            val id = phonemeMap.optInt(charStr, phonemeMap.optInt("<unk>", 0))
            phonemeIds.add(id.toLong())
        }

        return phonemeIds.toLongArray()
    }

    /**
     * Génère l'audio via ONNX Runtime
     */
    private fun generateAudio(phonemes: LongArray, rate: Float, pitch: Float): FloatArray {
        val session = ortSession
            ?: throw IllegalStateException("ONNX session not initialized")

        // Créer le tensor d'entrée
        val inputShape = longArrayOf(1, phonemes.size.toLong())
        val inputTensor = OnnxTensor.createTensor(ortEnv, phonemes, inputShape)

        // Paramètres de synthèse
        val lengthScale = 1.0f / rate
        val noiseScale = 0.667f
        val noiseW = 0.8f

        val scalesData = floatArrayOf(lengthScale, noiseScale, noiseW)
        val scalesTensor = OnnxTensor.createTensor(
            ortEnv,
            FloatBuffer.wrap(scalesData),
            longArrayOf(3)
        )

        // Longueur d'entrée
        val inputLengthTensor = OnnxTensor.createTensor(
            ortEnv,
            longArrayOf(phonemes.size.toLong()),
            longArrayOf(1)
        )

        // Exécuter l'inférence
        val inputs = mapOf(
            "input" to inputTensor,
            "input_lengths" to inputLengthTensor,
            "scales" to scalesTensor
        )

        val results = session.run(inputs)
        val outputTensor = results[0] as OnnxTensor

        // Extraire les données audio
        val audioData = outputTensor.floatBuffer.array()

        // Cleanup
        inputTensor.close()
        scalesTensor.close()
        inputLengthTensor.close()
        results.close()

        return audioData
    }

    /**
     * Sauvegarde l'audio en WAV
     */
    private fun saveWAV(audioData: FloatArray, file: File) {
        val sampleRate = 22050
        val numChannels: Short = 1
        val bitsPerSample: Short = 16

        // Convertir Float32 en Int16
        val int16Data = ShortArray(audioData.size) { i ->
            val clampedSample = max(-1.0f, min(1.0f, audioData[i]))
            (clampedSample * Short.MAX_VALUE).toInt().toShort()
        }

        FileOutputStream(file).use { fos ->
            val buffer = ByteBuffer.allocate(44 + int16Data.size * 2).order(ByteOrder.LITTLE_ENDIAN)

            // RIFF header
            buffer.put("RIFF".toByteArray())
            buffer.putInt(36 + int16Data.size * 2)
            buffer.put("WAVE".toByteArray())

            // fmt chunk
            buffer.put("fmt ".toByteArray())
            buffer.putInt(16)
            buffer.putShort(1) // PCM
            buffer.putShort(numChannels)
            buffer.putInt(sampleRate)
            val byteRate = sampleRate * numChannels * (bitsPerSample / 8)
            buffer.putInt(byteRate)
            val blockAlign = (numChannels * (bitsPerSample / 8)).toShort()
            buffer.putShort(blockAlign)
            buffer.putShort(bitsPerSample)

            // data chunk
            buffer.put("data".toByteArray())
            buffer.putInt(int16Data.size * 2)
            for (sample in int16Data) {
                buffer.putShort(sample)
            }

            fos.write(buffer.array())
        }
    }

    override fun handleOnDestroy() {
        mediaPlayer?.release()
        mediaPlayer = null
        ortSession?.close()
        ortSession = null
        super.handleOnDestroy()
    }
}
