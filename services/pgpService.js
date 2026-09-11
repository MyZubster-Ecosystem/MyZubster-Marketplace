// services/pgpService.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PGP_KEY_ID = process.env.PGP_KEY_ID || null;
const PGP_PASSPHRASE = process.env.PGP_PASSPHRASE || null;

// Firma un messaggio
const signMessage = (message) => {
  return new Promise((resolve, reject) => {
    if (!PGP_KEY_ID || !PGP_PASSPHRASE) {
      return reject(new Error('PGP non configurato. Imposta PGP_KEY_ID e PGP_PASSPHRASE nel .env'));
    }

    const tempFile = path.join('/tmp', `msg_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, message);

    exec(
      `gpg --default-key ${PGP_KEY_ID} --passphrase ${PGP_PASSPHRASE} --detach-sign --armor ${tempFile}`,
      (error, stdout, stderr) => {
        fs.unlinkSync(tempFile);
        if (error) {
          console.error('❌ Errore firma PGP:', stderr);
          return reject(error);
        }
        const sigFile = tempFile + '.asc';
        const signature = fs.readFileSync(sigFile, 'utf8');
        fs.unlinkSync(sigFile);
        resolve(signature);
      }
    );
  });
};

// Verifica una firma
const verifySignature = (message, signature, publicKey) => {
  return new Promise((resolve, reject) => {
    const msgFile = path.join('/tmp', `msg_${Date.now()}.txt`);
    const sigFile = path.join('/tmp', `sig_${Date.now()}.asc`);
    const keyFile = path.join('/tmp', `key_${Date.now()}.asc`);

    fs.writeFileSync(msgFile, message);
    fs.writeFileSync(sigFile, signature);
    fs.writeFileSync(keyFile, publicKey);

    exec(
      `gpg --import ${keyFile} 2>/dev/null && gpg --verify ${sigFile} ${msgFile} 2>&1`,
      (error, stdout, stderr) => {
        fs.unlinkSync(msgFile);
        fs.unlinkSync(sigFile);
        fs.unlinkSync(keyFile);
        if (error) {
          console.error('❌ Errore verifica firma:', stderr);
          return reject(error);
        }
        resolve(stdout.includes('Good signature') || stdout.includes('Buona firma'));
      }
    );
  });
};

// Cifra un messaggio per un destinatario
const encryptMessage = (message, recipientKey) => {
  return new Promise((resolve, reject) => {
    if (!recipientKey) {
      return reject(new Error('Chiave pubblica del destinatario richiesta'));
    }

    const keyFile = path.join('/tmp', `key_${Date.now()}.asc`);
    const msgFile = path.join('/tmp', `msg_${Date.now()}.txt`);

    fs.writeFileSync(keyFile, recipientKey);
    fs.writeFileSync(msgFile, message);

    exec(
      `gpg --import ${keyFile} 2>/dev/null && gpg --encrypt --armor --recipient ${PGP_KEY_ID} ${msgFile} 2>&1`,
      (error, stdout, stderr) => {
        fs.unlinkSync(keyFile);
        fs.unlinkSync(msgFile);
        if (error) {
          console.error('❌ Errore cifratura PGP:', stderr);
          return reject(error);
        }
        const encrypted = fs.readFileSync(msgFile + '.asc', 'utf8');
        fs.unlinkSync(msgFile + '.asc');
        resolve(encrypted);
      }
    );
  });
};

module.exports = {
  signMessage,
  verifySignature,
  encryptMessage,
};