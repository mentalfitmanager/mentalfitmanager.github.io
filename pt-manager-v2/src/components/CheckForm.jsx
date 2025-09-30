import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { db, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { FiUploadCloud } from 'react-icons/fi';

export default function CheckForm({ clientId }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onSubmit = async (data) => {
    setIsUploading(true);
    setUploadProgress(0);

    const files = Array.from(data.photos);
    if (files.length === 0) {
      alert("Per favore, seleziona almeno una foto.");
      setIsUploading(false);
      return;
    }

    try {
      // 1. Carica tutte le foto e ottieni i loro URL
      const photoURLs = await Promise.all(
        files.map(file => {
          return new Promise((resolve, reject) => {
            const fileName = `${uuidv4()}-${file.name}`;
            const storageRef = ref(storage, `clients/${clientId}/checks/${fileName}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
              }, 
              (error) => reject(error), 
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              }
            );
          });
        })
      );
      
      // 2. Salva i dati del check in Firestore
      await addDoc(collection(db, 'clients', clientId, 'checks'), {
        notes: data.notes,
        photoURLs: photoURLs,
        createdAt: serverTimestamp()
      });

      reset(); // Pulisce il form per il prossimo inserimento
      
    } catch (error) {
      console.error("Errore nel processo di salvataggio del check:", error);
      alert("Si è verificato un errore durante il salvataggio.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const inputStyle = "w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all";
  const labelStyle = "block mb-1 text-sm font-medium text-muted";

  return (
    <div className="bg-card p-6 rounded-xl border border-white/10">
      <h3 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
        <FiUploadCloud /> Nuovo Check
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="notes" className={labelStyle}>Note sui progressi</label>
          <textarea
            id="notes"
            {...register('notes')}
            rows="4"
            className={inputStyle}
            placeholder="Es. Aumento carichi, sensazioni, misure..."
          ></textarea>
        </div>

        <div>
          <label htmlFor="photos" className={labelStyle}>Foto Progressi</label>
          <input
            id="photos"
            type="file"
            multiple
            accept="image/png, image/jpeg, image/webp"
            {...register('photos', { required: "Le foto sono obbligatorie." })}
            className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
          />
          {errors.photos && <p className="text-red-400 text-xs mt-1">{errors.photos.message}</p>}
        </div>

        {isUploading && (
          <div className="w-full bg-background rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUploading}
            className="px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg transition disabled:opacity-50 font-semibold"
          >
            {isUploading ? `Caricamento... ${Math.round(uploadProgress)}%` : 'Salva Check'}
          </button>
        </div>
      </form>
    </div>
  );
}

