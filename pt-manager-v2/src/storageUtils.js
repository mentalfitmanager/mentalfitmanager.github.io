// src/storageUtils.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase'; 
import { v4 as uuidv4 } from 'uuid'; 

/**
 * Carica un file su Firebase Storage.
 * @param {File} file - Il file da caricare.
 * @param {string} clientId - L'ID del cliente per la cartella di destinazione.
 * @param {string} folder - Sotto-cartella (es. 'anamnesi' o 'checks').
 * @returns {Promise<string|null>} L'URL pubblico del file caricato, o null in caso di errore.
 */
export const uploadPhoto = async (file, clientId, folder = 'checks') => {
  if (!file) return null;

  // 1. Crea un nome file unico
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  
  // 2. Definisce il percorso su Storage: clients/{clientId}/{folder}/{fileName}
  const storageRef = ref(storage, `clients/${clientId}/${folder}/${fileName}`);

  try {
    // 3. Carica il file
    const snapshot = await uploadBytes(storageRef, file);
    
    // 4. Ottieni l'URL pubblico per il download
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
    
  } catch (error) {
    console.error("Errore nell'upload della foto su Storage: ", error);
    return null;
  }
};