import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from "html5-qrcode"; // Importação da sua lib
import { X, ScanLine, QrCode } from 'lucide-react';
import ModalOverlay from './ModalOverlay'; // Seu componente existente

const QrScannerModal = ({ isOpen, onClose, onScan }) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(false);

  // --- LÓGICA DA CÂMERA (SUA LÓGICA MANTIDA) ---
  useEffect(() => {
    let html5QrCode;
    
    if (isOpen) {
      setCameraError(false); // Reseta erro ao abrir

      const startScanner = async () => {
        // Delay para garantir renderização do DOM
        await new Promise(r => setTimeout(r, 300));
        
        const element = document.getElementById("reader");
        if (!element) return;

        try {
            // Cria a instância
            html5QrCode = new Html5Qrcode("reader");
            
            // Inicia o scanner
            await html5QrCode.start(
                { facingMode: "environment" }, // Câmera traseira
                { fps: 10, qrbox: { width: 250, height: 250 } }, // Configuração da caixa
                (decodedText) => {
                    // SUCESSO: Chama a função do pai
                    onScan(decodedText);
                    // Opcional: Pausar scanner após leitura
                    html5QrCode.pause(); 
                },
                (errorMessage) => {
                    // Erro de leitura de frame (ignoramos, pois acontece a cada frame que não tem QR)
                }
            );
        } catch (err) {
            console.error("Erro ao iniciar câmera:", err);
            setCameraError(true);
        }
      };

      startScanner();

      // CLEANUP: Para a câmera ao fechar
      return () => {
         if (html5QrCode && html5QrCode.isScanning) {
             html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
         }
      };
    }
  }, [isOpen]); // Dependências

  // --- ENVIO MANUAL ---
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if(manualCode) {
        onScan(manualCode);
        setManualCode('');
    }
  };

  if (!isOpen) return null;

  // --- RENDERIZAÇÃO ---
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md relative mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <ScanLine size={20} className="text-[#0097A8]"/> Validar Ingresso
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500"/>
            </button>
        </div>
        
        {/* ÁREA DO LEITOR (ID "reader" é obrigatório para html5-qrcode) */}
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-square border-4 border-slate-100 shadow-inner flex items-center justify-center">
            
            {!cameraError ? (
                <>
                    {/* A lib injeta o vídeo aqui dentro */}
                    <div id="reader" className="w-full h-full"></div>
                    
                    {/* Overlay Visual (Estética) */}
                    <div className="absolute inset-0 border-[40px] border-black/30 pointer-events-none z-10"></div>
                    <div className="absolute w-64 h-64 border-2 border-white/50 rounded-lg pointer-events-none z-10 shadow-[0_0_0_999px_rgba(0,0,0,0.4)]"></div>
                    <div className="absolute top-4 text-white/90 text-xs font-bold bg-black/50 px-3 py-1 rounded-full pointer-events-none z-20">
                        Aponte para o QR Code
                    </div>
                </>
            ) : (
                <div className="text-center p-6 text-white">
                    <p className="text-sm font-bold text-red-400 mb-2">Câmera indisponível</p>
                    <p className="text-xs text-slate-400">Verifique permissões ou use o código manual abaixo.</p>
                </div>
            )}
        </div>

        {/* ÁREA MANUAL (Adicionei para garantir que funcione se a câmera falhar) */}
        <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-3 text-slate-400">
                <QrCode size={14} />
                <p className="text-center text-[10px] font-bold uppercase tracking-wider">Falha na leitura? Digite:</p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-[#0097A8] uppercase font-mono tracking-widest text-center text-lg placeholder:text-slate-300"
                    placeholder="CÓDIGO"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value.toUpperCase())}
                    maxLength={20} // Aumentei caso seja ID do firebase
                />
                <button 
                    type="submit" 
                    disabled={!manualCode}
                    className="bg-[#0097A8] hover:bg-[#008ba0] disabled:opacity-50 text-white px-6 rounded-xl font-bold transition-colors shadow-lg shadow-cyan-900/10"
                >
                    OK
                </button>
            </form>
        </div>

      </div>
      
      {/* Ajuste CSS para esconder botões feios padrão da lib html5-qrcode se aparecerem */}
      <style>{`
        #reader__scan_region { object-fit: cover; }
        #reader__dashboard_section_csr button { display: none; } 
        #reader video { object-fit: cover; border-radius: 1rem; }
      `}</style>
    </div>,
    document.body
  );
};

export default QrScannerModal;