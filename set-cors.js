const admin = require('firebase-admin');
const fs = require('fs');

// Intentamos cargar las credenciales disponibles en el workspace
let serviceAccountPath = './service-account.json';
if (!fs.existsSync(serviceAccountPath)) {
  serviceAccountPath = './ferraza-service-account.json';
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ No se encontró ningún archivo de credenciales de Service Account en el workspace.');
  process.exit(1);
}

console.log(`ℹ️ Usando credenciales de: ${serviceAccountPath}`);
const serviceAccount = require(serviceAccountPath);

// Inicializar el SDK de administración
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'barberia-elegance.firebasestorage.app'
});

async function setBucketCors() {
  try {
    const bucket = admin.storage().bucket();
    console.log(`🔄 Configurando CORS para el bucket: ${bucket.name}...`);
    
    await bucket.setCorsConfiguration([
      {
        origin: ['*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
        maxAgeSeconds: 3600
      }
    ]);
    
    console.log('✅ ¡CORS configurado exitosamente en Firebase Storage para resolver el bloqueo del Canvas!');
  } catch (error) {
    console.error('❌ Error al configurar CORS en el bucket:', error);
  }
}

setBucketCors();
