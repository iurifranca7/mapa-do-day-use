import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, Copy } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import Button from './Button';

const PixModal = ({ isOpen, onClose, pixData, onConfirm, paymentId, ownerId }) => {
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Verificação automática a cada 5 segundos
  useEffect(() => {
    let interval;
    if (isOpen && paymentId) {
      interval = setInterval(() => {
        // Ignora verificação automática se for ID de simulação
        if (paymentId && !paymentId.toString().startsWith("PIX-") && !paymentId.toString().startsWith("FRONT_")) {
            checkStatus(false); 
        }
      }, 5000);
    }
    return () => {
        clearInterval(interval);
        setStatusMsg(null);
    };
  }, [isOpen, paymentId, ownerId]);

  const checkStatus = async (isManual = true) => {
      if (isManual) { setChecking(true); setStatusMsg(null); }
      
      // Bypass para modo de teste/simulação local
      if (paymentId && (paymentId.toString().startsWith("PIX-") || paymentId.toString().startsWith("FRONT_"))) {
          setTimeout(() => {
              setStatusMsg({ type: 'success', text: "Pagamento simulado confirmado! Finalizando..." });
              setTimeout(() => { onConfirm(); onClose(); }, 1500);
          }, 1000);
          setChecking(false);
          return;
      }

      // Lógica Real: Consulta API enviando o ID do Pagamento E o ID do Dono
      try {
          const response = await fetch('/api/check-payment-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  paymentId, 
                  ownerId // IMPORTANTE: Envia o ID do parceiro para a API buscar o token correto
              })
          });
          
          if (!response.ok) throw new Error("Erro na verificação");
          
          const data = await response.json();
          
          if (data.status === 'approved') {
              setStatusMsg({ type: 'success', text: "Pagamento confirmado! Emitindo voucher..." });
              setTimeout(() => { onConfirm(); onClose(); }, 1500);
          } else {
              if (isManual) {
                  const statusMap = { pending: 'Pendente', in_process: 'Em processamento', rejected: 'Rejeitado' };
                  const statusText = statusMap[data.status] || data.status;
                  setStatusMsg({ type: 'info', text: `Status atual: ${statusText}. Aguarde a confirmação do banco.` });
              }
          }
      } catch (error) { 
          console.error(error);
          if (isManual) setStatusMsg({ type: 'error', text: "Não foi possível verificar no momento." }); 
      } finally { 
          if (isManual) setChecking(false); 
      }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixData.qr_code);
    setStatusMsg({ type: 'success', text: "Código copiado!" });
  };

  if (!isOpen || !pixData) return null;
  
  // Exibe a imagem do QR Code (Base64 se vier do MP, ou gerado externamente se for string raw)
  const qrCodeImageUrl = pixData.qr_code_base64 
      ? `data:image/png;base64,${pixData.qr_code_base64}`
      : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.qr_code)}`;

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="p-6 text-center animate-fade-in bg-white rounded-3xl shadow-xl max-w-sm w-full relative">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4"><Ticket size={32}/></div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Pagamento via PIX</h2>
        
        {/* Mostra aviso se for ID de produção aguardando banco */}
        {paymentId && !paymentId.toString().startsWith("PIX-") && !paymentId.toString().startsWith("FRONT_") && (
            <div className="flex items-center justify-center gap-2 mb-4 text-xs text-orange-500 font-bold bg-orange-50 p-2 rounded-lg animate-pulse">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Aguardando confirmação do banco...
            </div>
        )}

        <p className="text-sm text-slate-500 mb-6">Escaneie o QR Code ou copie o código abaixo.</p>
        
        <div className="flex justify-center mb-6">
            <img 
                src={qrCodeImageUrl} 
                alt="QR Code Pix" 
                className="w-48 h-48 border-4 border-slate-100 rounded-xl shadow-sm bg-white" 
            />
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-2 mb-6">
           <p className="text-xs text-slate-500 font-mono truncate flex-1 text-left">{pixData.qr_code}</p>
           <button onClick={copyToClipboard} className="text-teal-600 hover:text-teal-700 p-2 font-bold text-xs uppercase flex items-center gap-1"><Copy size={14}/> Copiar</button>
        </div>

        {statusMsg && (
            <div className={`text-xs p-3 rounded-xl mb-4 font-medium animate-fade-in ${ statusMsg.type === 'success' ? 'bg-green-100 text-green-700' : statusMsg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700' }`}>
                {statusMsg.text}
            </div>
        )}
        
        <Button className="w-full mb-3" onClick={() => checkStatus(true)} disabled={checking}>
            {checking ? 'Verificando...' : 'Já fiz o pagamento'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>Cancelar</Button>
      </div>
    </ModalOverlay>,
    document.body
  );
};

export default PixModal;