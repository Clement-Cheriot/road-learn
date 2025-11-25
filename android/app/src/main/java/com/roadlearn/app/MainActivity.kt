package com.roadlearn.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enregistrer les plugins personnalisés
        registerPlugin(PiperTTSPlugin::class.java)
    }
}
