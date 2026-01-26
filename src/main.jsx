import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Se tiver CSS global
import { BrowserRouter } from 'react-router-dom'

// Inicializa o App com o Sistema de Rotas (BrowserRouter)
ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
)