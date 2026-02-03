import { useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase'; // Ajuste o caminho
import { notifyTicketStatusChange } from '../utils/notifications'; // Ajuste o caminho

export const useTicketValidation = (user) => {
    const [scannedRes, setScannedRes] = useState(null);
    const [parentRes, setParentRes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. BUSCAR INGRESSO (SCAN)
    const scanTicket = async (rawValue) => {
        setLoading(true);
        setError(null);
        setScannedRes(null);
        setParentRes(null);

        try {
            let code = rawValue || '';
            if (code.includes('http') || code.includes('/')) {
                if (code.endsWith('/')) code = code.slice(0, -1);
                const parts = code.split('/');
                code = parts[parts.length - 1]; 
            }
            code = code.trim();

            console.log("Hook buscando:", code);

            // Busca Dupla (TicketCode ou ID)
            const qTicketCode = query(collection(db, "reservations"), where("ownerId", "==", user.uid), where("ticketCode", "==", code.toUpperCase()));
            const docRef = doc(db, "reservations", code);
            
            const [snapTicket, docSnapId] = await Promise.all([getDocs(qTicketCode), getDoc(docRef)]);

            let foundData = null;
            if (!snapTicket.empty) {
                const d = snapTicket.docs[0];
                foundData = { id: d.id, ...d.data() };
            } else if (docSnapId.exists() && docSnapId.data().ownerId === user.uid) {
                foundData = { id: docSnapId.id, ...docSnapId.data() };
            }

            if (!foundData) {
                alert(`Ingresso não encontrado.\nCódigo: ${code}`);
                setLoading(false);
                return;
            }

            // Alerta de Cancelado
            const payStatus = (foundData.paymentStatus || foundData.status || '').toLowerCase();
            if (['cancelled', 'rejected', 'refunded'].includes(payStatus)) {
                alert(`ATENÇÃO: Ingresso CANCELADO ou REEMBOLSADO!`);
            }

            // Busca Responsável (Se for dependente)
            if (foundData.linkedToReservationId) {
                const parentDoc = await getDoc(doc(db, "reservations", foundData.linkedToReservationId));
                if (parentDoc.exists()) {
                    setParentRes({ id: parentDoc.id, ...parentDoc.data() });
                }
            }

            setScannedRes(foundData);

        } catch (err) {
            console.error(err);
            setError("Erro técnico ao buscar ingresso.");
            alert("Erro técnico ao buscar ingresso.");
        } finally {
            setLoading(false);
        }
    };

    // 2. CONFIRMAR VALIDAÇÃO
    const confirmValidation = async (verifiedParent = false) => {
        if (!scannedRes) return;

        try {
            const updateData = {
                status: 'validated',
                checkedInAt: new Date(),
                validationMethod: 'qr_app_scan',
                history: arrayUnion(
                    `Validado via App/Painel em ${new Date().toLocaleString('pt-BR')}`,
                    `📧 E-mail de entrada confirmada enviado`
                )
            };

            if (scannedRes.linkedToReservationId && parentRes && verifiedParent) {
                const logMsg = `Entrada autorizada mediante presença do responsável: ${parentRes.guestName}`;
                updateData.checkInNote = logMsg;
            }

            await updateDoc(doc(db, "reservations", scannedRes.id), updateData);
            
            // Dispara e-mail
            notifyTicketStatusChange(scannedRes, 'validated');

            alert(`✅ Entrada Confirmada: ${scannedRes.guestName}`);
            setScannedRes(null);
            setParentRes(null);
            return true; // Sucesso

        } catch (err) {
            console.error(err);
            alert("Erro ao salvar validação.");
            return false;
        }
    };

    const resetScan = () => {
        setScannedRes(null);
        setParentRes(null);
        setError(null);
    };

    return {
        scannedRes,
        parentRes,
        loading,
        error,
        scanTicket,
        confirmValidation,
        resetScan
    };
};