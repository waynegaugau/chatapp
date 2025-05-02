import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
//  storageBucket: 'chat-app-ef696.appspot.com'
  storageBucket: 'gs://chat-app-ef696.firebasestorage.app' // 🛠️ sửa đúng tên bucket của bạn

});

//bucket
export const bucket = admin.storage().bucket();
