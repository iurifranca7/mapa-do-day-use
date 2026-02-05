import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase'; // Ajuste o caminho conforme sua estrutura
import { 
    X, ScanLine, AlertCircle, Package, Link as LinkIcon, 
    CheckCircle, Ban, Clock, AlertTriangle 
} from 'lucide-react';
import Button from './Button'; // Ajuste o caminho
import ModalOverlay from './ModalOverlay'; // Ajuste o caminho
import { notifyTicketStatusChange } from '../utils/notifications'; // Ajuste o caminho

const TicketValidationModal = ({ 
    reservation, 
    onClose, 
    onValidationSuccess 
}) => {
    const [loading, setLoading] = useState(false);
    const [parentRes, setParentRes] = useState(null);
    const [parentVerified, setParentVerified] = useState(false);
    const [feedback, setFeedback] = useState(null); // Feedback interno caso queira mostrar erro no modal

    // --- 1. LÓGICA DE DETECÇÃO DE VÍNCULO E BUSCA DO RESPONSÁVEL ---
    useEffect(() => {
        const fetchParent = async () => {
            if (!reservation) return;

            // Lógica Híbrida Blindada: Procura o vínculo na raiz, raiz legada ou itens
            const itemsList = reservation.cartItems || reservation.bookingDetails?.cartItems || [];
            const linkedId = reservation.linkedToReservationId 
                          || reservation.parentTicketId 
                          || itemsList.find(i => i.linkedToReservationId)?.linkedToReservationId;

            if (linkedId) {
                try {
                    const parentDoc = await getDoc(doc(db, "reservations", linkedId));
                    if (parentDoc.exists()) {
                        setParentRes({ id: parentDoc.id, ...parentDoc.data() });
                    }
                } catch (error) {
                    console.error("Erro ao buscar responsável:", error);
                }
            } else {
                setParentRes(null);
            }
            setParentVerified(false); // Reseta o checkbox ao abrir
        };

        fetchParent();
    }, [reservation]);

    // --- 2. AÇÃO DE VALIDAÇÃO ---
    const handleConfirmValidation = async () => {
        if (!reservation) return;
        setLoading(true);

        try {
            const updateData = {
                status: 'validated',
                checkedInAt: new Date(),
                validationMethod: 'qr_scanner_component',
                history: arrayUnion(
                    `Validado via QR Code em ${new Date().toLocaleString('pt-BR')}`,
                    `📧 E-mail de entrada confirmada enviado para o cliente`
                )
            };

            // Log se houver responsável verificado
            if (parentRes && parentVerified) {
                const logMsg = `Entrada autorizada mediante presença do responsável: ${parentRes.guestName} (#${parentRes.id.slice(0,6).toUpperCase()})`;
                updateData.checkInNote = logMsg;
            }

            await updateDoc(doc(db, "reservations", reservation.id), updateData);
            
            // Dispara notificação
            notifyTicketStatusChange(reservation, 'validated').catch(console.error);

            // Avisa o componente pai que deu certo
            if (onValidationSuccess) {
                onValidationSuccess(reservation);
            }
            onClose(); // Fecha o modal

        } catch (error) {
            console.error("Erro ao validar:", error);
            alert("Erro ao validar ingresso. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // --- HELPERS VISUAIS ---
    const translateStatus = (status) => {
        const s = (status || '').toLowerCase();
        if (['approved', 'confirmed', 'paid'].includes(s)) return { text: 'Pago/Confirmado', bg: 'bg-green-100', color: 'text-green-700' };
        if (['validated'].includes(s)) return { text: 'Já Utilizado', bg: 'bg-blue-100', color: 'text-blue-700' };
        if (['cancelled', 'rejected'].includes(s)) return { text: 'Cancelado', bg: 'bg-red-100', color: 'text-red-700' };
        return { text: status, bg: 'bg-slate-100', color: 'text-slate-500' };
    };

    if (!reservation) return null;

    const statusInfo = translateStatus(reservation.status === 'validated' ? 'validated' : (reservation.status || reservation.paymentStatus));
    const isDateMismatch = reservation.date !== new Date().toISOString().split('T')[0];
    
    // Recalcula ID para uso no render (mesma lógica do useEffect)
    const itemsList = reservation.cartItems || reservation.bookingDetails?.cartItems || [];
    const linkedId = reservation.linkedToReservationId || reservation.parentTicketId || itemsList.find(i => i.linkedToReservationId)?.linkedToReservationId;

    return createPortal(
        <ModalOverlay onClose={onClose}>
            <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md animate-fade-in relative mx-4 max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                        <ScanLine className="text-[#0097A8]"/> Conferir Ingresso
                    </h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>

                {/* Cliente Info */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{reservation.guestName || "Cliente"}</h2>
                    <p className="text-sm text-slate-500 font-mono mt-1">#{reservation.ticketCode || reservation.id.slice(0,6).toUpperCase()}</p>
                </div>

                {/* Alerta de Data Errada */}
                {isDateMismatch && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl text-left shadow-sm">
                        <div className="flex items-center gap-2 text-red-800 font-bold mb-1"><AlertCircle size={20}/> <span>DATA DIFERENTE!</span></div>
                        <p className="text-sm text-red-700">Válido para: <strong>{reservation.date ? reservation.date.split('-').reverse().join('/') : 'Data indefinida'}</strong>.<br/>Hoje: {new Date().toLocaleDateString('pt-BR')}.</p>
                    </div>
                )}

                {/* Detalhes dos Itens */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Package size={12}/> Itens do Ingresso</p>
                    <div className="space-y-2">
                        {itemsList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                                <div className="leading-tight">
                                    <span className="font-bold text-slate-700">{item.quantity || item.amount || 1}x {item.title}</span>
                                    {item.description && <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Status Atual:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.text}
                        </span>
                    </div>
                </div>

                {/* --- AVISO DE INGRESSO VINCULADO (BLINDADO) --- */}
                {linkedId && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 text-left">
                        <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                            <LinkIcon size={18}/> Verificação de Responsável
                        </div>
                        <p className="text-xs text-amber-700 mb-3">
                            Este é um ingresso <strong>dependente</strong>. A entrada só é permitida na presença do titular.
                        </p>
                        
                        {parentRes ? (
                            <div className="bg-white p-3 rounded-lg border border-amber-100 mb-3">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Responsável</p>
                                <p className="font-bold text-slate-800">{parentRes.guestName}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-slate-500 font-mono">#{parentRes.ticketCode || parentRes.id.slice(0,6).toUpperCase()}</p>
                                    
                                    {/* Status Visual do Pai */}
                                    {parentRes.status === 'validated' || parentRes.checkedInAt ? (
                                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                            <CheckCircle size={10}/> Já entrou
                                        </span>
                                    ) : (
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                                            Ainda não entrou
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic mb-3 flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                                Buscando dados do responsável...
                            </div>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-amber-100/50 rounded-lg transition-colors select-none">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors ${parentVerified ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-amber-300'}`}>
                                {parentVerified && <CheckCircle size={14}/>}
                            </div>
                            <input type="checkbox" className="hidden" checked={parentVerified} onChange={(e) => setParentVerified(e.target.checked)} />
                            <span className="text-xs font-bold text-slate-700 leading-tight">
                                Confirmo que o responsável acima está presente no local.
                            </span>
                        </label>
                    </div>
                )}

                {/* Ações */}
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="flex-1 justify-center">Cancelar</Button>
                    
                    {['approved', 'confirmed', 'paid'].includes(reservation.status || reservation.paymentStatus) && reservation.status !== 'validated' ? (
                        <Button 
                            onClick={handleConfirmValidation} 
                            disabled={loading || (linkedId && !parentVerified)}
                            className={`flex-1 justify-center shadow-lg ${
                                (linkedId && !parentVerified) 
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
                            }`}
                        >
                            {loading ? 'Validando...' : 'Confirmar Entrada'}
                        </Button>
                    ) : (
                        <Button disabled className="flex-1 justify-center opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 border-none">
                            Inválido / Já Usado
                        </Button>
                    )}
                </div>
            </div>
        </ModalOverlay>,
        document.body
    );
};

export default TicketValidationModal;