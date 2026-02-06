import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase'; 
import { 
    X, ScanLine, AlertCircle, Package, Link as LinkIcon, 
    CheckCircle, Ban, AlertTriangle, ShieldAlert 
} from 'lucide-react';
import Button from './Button'; 
import ModalOverlay from './ModalOverlay'; 
import { notifyTicketStatusChange } from '../utils/notifications'; 

const TicketValidationModal = ({ 
    reservation, 
    onClose, 
    onValidationSuccess 
}) => {
    const [loading, setLoading] = useState(false);
    const [parentRes, setParentRes] = useState(null);
    const [parentVerified, setParentVerified] = useState(false);

    // --- 1. LÓGICA DE DETECÇÃO DE VÍNCULO ---
    useEffect(() => {
        const fetchParent = async () => {
            if (!reservation) return;

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
            setParentVerified(false); 
        };

        fetchParent();
    }, [reservation]);

    // --- 2. CHECAGEM DE BLOQUEIO (CHARGEBACK / FRAUDE) ---
    if (!reservation) return null;

    // Normaliza status para comparação segura
    const status = (reservation.status || '').toLowerCase();
    const mpStatus = (reservation.mpStatus || reservation.paymentStatus || '').toLowerCase();

    // Lista Negra de Acesso
    const BLOCK_LIST = [
        'cancelled',      // Cancelado no sistema
        'rejected',       // Recusado no pagamento
        'refunded',       // Estornado (Dinheiro devolvido)
        'disputed',       // 🔥 Disputa Aberta
        'charged_back',   // 🔥 Dinheiro tomado pelo banco
        'in_mediation'    // 🔥 Em análise de fraude
    ];

    const isBlocked = BLOCK_LIST.includes(status) || BLOCK_LIST.includes(mpStatus);
    const isDispute = ['disputed', 'charged_back', 'in_mediation'].includes(mpStatus);

    // --- 3. TELA DE BLOQUEIO (RENDERIZAÇÃO ANTECIPADA) ---
    if (isBlocked) {
        return createPortal(
            <ModalOverlay onClose={onClose}>
                <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md animate-fade-in relative mx-4 text-center border-t-8 border-red-600">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <ShieldAlert size={40} className="text-red-600"/>
                    </div>
                    
                    <h2 className="text-2xl font-black text-red-600 mb-2 uppercase tracking-wide">
                        {isDispute ? 'PAGAMENTO CONTESTADO' : 'ACESSO NEGADO'}
                    </h2>
                    
                    <p className="text-slate-600 font-bold text-lg mb-1">{reservation.guestName}</p>
                    <p className="text-slate-400 font-mono text-sm mb-6">#{reservation.ticketCode || reservation.id.slice(0,6).toUpperCase()}</p>

                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-left mb-6">
                        <p className="text-red-800 font-bold text-sm flex items-center gap-2 mb-1">
                            <AlertTriangle size={16}/> Motivo do Bloqueio:
                        </p>
                        <p className="text-red-700 text-sm leading-relaxed">
                            {isDispute 
                                ? "Este pagamento foi contestado junto ao banco (Chargeback). O valor foi bloqueado e o ingresso cancelado automaticamente."
                                : "Este ingresso consta como cancelado, reembolsado ou pagamento recusado."
                            }
                        </p>
                    </div>

                    <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-900 text-white justify-center py-4">
                        Fechar e Recusar Entrada
                    </Button>
                </div>
            </ModalOverlay>,
            document.body
        );
    }

    // --- 4. FLUXO NORMAL (Se não estiver bloqueado) ---
    
    // Recalcula variáveis para o fluxo normal
    const statusInfo = { text: 'Pago/Confirmado', bg: 'bg-green-100', color: 'text-green-700' };
    if (status === 'validated') { statusInfo.text = 'Já Utilizado'; statusInfo.bg = 'bg-blue-100'; statusInfo.color = 'text-blue-700'; }
    
    const isDateMismatch = reservation.date !== new Date().toISOString().split('T')[0];
    const itemsList = reservation.cartItems || reservation.bookingDetails?.cartItems || [];
    const linkedId = reservation.linkedToReservationId || reservation.parentTicketId || itemsList.find(i => i.linkedToReservationId)?.linkedToReservationId;

    const handleConfirmValidation = async () => {
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

            if (parentRes && parentVerified) {
                updateData.checkInNote = `Entrada autorizada mediante presença do responsável: ${parentRes.guestName} (#${parentRes.id.slice(0,6).toUpperCase()})`;
            }

            await updateDoc(doc(db, "reservations", reservation.id), updateData);
            notifyTicketStatusChange(reservation, 'validated').catch(console.error);

            if (onValidationSuccess) onValidationSuccess(reservation);
            onClose();

        } catch (error) {
            console.error("Erro ao validar:", error);
            alert("Erro técnico. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

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

                {/* --- AVISO DE INGRESSO VINCULADO --- */}
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
                    
                    {reservation.status === 'validated' ? (
                        <Button disabled className="flex-1 justify-center opacity-50 cursor-not-allowed bg-blue-100 text-blue-700 border-none">
                            Já Utilizado
                        </Button>
                    ) : (
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
                    )}
                </div>
            </div>
        </ModalOverlay>,
        document.body
    );
};

export default TicketValidationModal;