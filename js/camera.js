let currentStream;
let currentDeviceId = null;
let zoom = 1;
let torchEnabled = false;

const cameraFeed = document.getElementById('video');
const photoCanvas = document.getElementById('photo-canvas');
const startCameraBtn = document.getElementById('start-camera-btn');
const startCameraContainer = document.getElementById('start-camera-container');
const shutterBtn = document.getElementById('shutter-btn');
const flashEffect = document.getElementById('flash-effect');
const flashBtn = document.getElementById('flash-btn');
const zoomSlider = document.getElementById('zoom-slider');
const zoomLevel = document.getElementById('zoom-level');
const resetBtn = document.getElementById('reset-btn');
const filterInfo = document.getElementById('filter-info');
const filtersBtnContainer = document.getElementById('filters-btn');
const filtersPanel = document.getElementById('filters-panel');
const filterBtns = document.querySelectorAll('.filter-btn');
const resolutionInfo = document.getElementById('resolution-info');
const switchCamBtn = document.getElementById('switch-cam-btn');
const cameraClose = document.querySelector('.btn-close');
const cameraDownload = document.querySelector('.btn-download');
const cameraInfoTopRight = document.querySelector('.top-right');
const lastCameraInfoTopRight = document.querySelector('.camera-info.top-right.close');

const constraints = {
	video: {
		facingMode: 'environment',
		pan: true, zoom: true, tilt: true,
    width: { min: 1280, max: 1920 },
    height: { min: 720, max: 1080 }, 
	},
	audio: false
};

async function getCameraStream(deviceId = null) {
	if (currentStream) currentStream.getTracks().forEach(track => track.stop());

	const newConstraints = {
		video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
		audio: false
	};

	try {
		const stream = await navigator.mediaDevices.getUserMedia(newConstraints);
		currentStream = stream;
		cameraFeed.srcObject = stream;

		const videoTrack = stream.getVideoTracks()[0];
		currentDeviceId = videoTrack.getSettings().deviceId || null;

    const settings = videoTrack.getSettings();
    if (settings.facingMode === 'user') {
      cameraFeed.style.transform = 'scaleX(-1)';
    } else {
      cameraFeed.style.transform = 'scaleX(1)';
    }

		handleCameraCapabilities(videoTrack);
	} catch (err) {
		alert('Erro ao acessar a câmera: ' + err.message);
	}
}

function handleCameraCapabilities(track) {
	const capabilities = track.getCapabilities();
  console.log('Capacidades da câmera:', capabilities);

	resolutionInfo.textContent = `Resolução: ${capabilities.width.max}x${capabilities.height.max}`;

	if (capabilities.zoom) {
		flashBtn.onclick = () => {
			torchEnabled = !torchEnabled;
			track.applyConstraints({ advanced: [{ torch: torchEnabled }] });
			flashEffect.style.display = torchEnabled ? 'block' : 'none';
			flashBtn.classList.toggle("active", torchEnabled);
		};

    if (capabilities.width && capabilities.height) {
      console.log(`Resolução máxima: ${capabilities.width.max}x${capabilities.height.max}`);
  }
	}
}

async function listCameras() {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter(device => device.kind === 'videoinput');
}

function updateZoom() {
	zoom = parseFloat(zoomSlider.value);
	cameraFeed.style.transform = `scale(${zoom})`;
	zoomLevel.textContent = `${zoom.toFixed(1)}x zoom`;
}

function resetCameraSettings() {
	zoom = 1;
	zoomSlider.value = 1;
	cameraFeed.style.transform = 'scale(1)';
	cameraFeed.style.filter = 'none';
	filterInfo.textContent = 'Filter: Normal';
	filterBtns.forEach(btn => btn.classList.remove('active'));
	filterBtns[0].classList.add('active');
}

function applyFilter(filter, label) {
	cameraFeed.style.filter = filter;
	filterInfo.textContent = `Filter: ${label}`;
	filterBtns.forEach(b => b.classList.remove('active'));
}

function createActionButtons() {
	const clearBtn = document.createElement('button');
	clearBtn.innerHTML = '<i class="fas fa-times" style="font-size: 25px;"></i>';
	clearBtn.classList.add('close-btn');
	clearBtn.addEventListener('click', () => {
		photoCanvas.style.display = 'none';
		cameraFeed.style.display = 'block';
		lastCameraInfoTopRight.style.display = 'flex !important';
		clearBtn.remove();
		saveBtn.remove();
	});
	cameraClose.appendChild(clearBtn);

	const saveBtn = document.createElement('button');
	saveBtn.innerHTML = '<i class="fas fa-download" style="font-size: 25px;"></i>';
	saveBtn.classList.add('save-btn');
	saveBtn.addEventListener('click', saveImage);
	cameraDownload.appendChild(saveBtn);
}

function capturePhoto() {
	const videoWidth = cameraFeed.videoWidth;
	const videoHeight = cameraFeed.videoHeight;

	photoCanvas.width = videoWidth;
	photoCanvas.height = videoHeight;

	const ctx = photoCanvas.getContext('2d');

	if (cameraFeed.style.filter) {
		ctx.filter = cameraFeed.style.filter;
	}

	if (cameraFeed.style.transform === 'scaleX(-1)') {
		ctx.translate(videoWidth, 0);
		ctx.scale(-1, 1);
	}

	ctx.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);

	cameraFeed.style.display = "none";
	photoCanvas.style.display = "block";
	cameraInfoTopRight.style.display = 'none';

	createActionButtons();
}

async function saveImage() {
	let initialStream;
	let highResStream;

	try {
		// Primeiro, obtenha o stream com o device atual
		initialStream = await navigator.mediaDevices.getUserMedia({
			video: { deviceId: { exact: currentDeviceId } },
			audio: false
		});

		const initialTrack = initialStream.getVideoTracks()[0];

		// Pegue as capacidades da câmera
		const capabilities = initialTrack.getCapabilities();
		const maxWidth = capabilities.width.max;
		const maxHeight = capabilities.height.max;

		console.log("Máxima resolução detectada (capabilities):", maxWidth, maxHeight);

		// Libera a câmera do primeiro stream
		initialTrack.stop();

		const newConstraints = {
			video: {
				deviceId: { exact: currentDeviceId },
				width: maxWidth,
				height: maxHeight,
			},
			audio: false
		};

		console.log("Novas constraints:", newConstraints);

		// Solicita novo stream com resolução ideal
		highResStream = await navigator.mediaDevices.getUserMedia(newConstraints);
		const highResTrack = highResStream.getVideoTracks()[0];

		let blob;

		if ("ImageCapture" in window) {
			try {
				const imageCapture = new ImageCapture(highResTrack);
				blob = await imageCapture.takePhoto();
				send(blob);
				console.log("Imagem capturada via ImageCapture.");
			} catch (e) {
				console.warn("Falha no takePhoto(), usando canvas como fallback:", e);
				blob = await canvasToBlob(photoCanvas);
			}
		} else {
			console.warn("ImageCapture não suportado, usando canvas.");
			blob = await canvasToBlob(photoCanvas);
			send(blob);
		}

		console.log("Tipo do arquivo capturado:", blob.type);

		// Cria um link para download
		const imgURL = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = imgURL;
		a.download = 'captured-image.png';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		// Libera a câmera do stream de alta resolução
		highResTrack.stop();

	} catch (error) {
		console.error('Erro ao capturar a imagem:', error);
	} finally {
		if (initialStream) {
			initialStream.getTracks().forEach(t => t.stop());
		}
		if (highResStream) {
			highResStream.getTracks().forEach(t => t.stop());
		}
	}
}

async function send(blob) {
	const filename = "captured-image.png"
	const form = new FormData();

	// const content = '<q id="a"><span id="b">hey!</span></q>';
	// const blob = new Blob([content], { type: "text/xml" });

	form.append("file", blob, filename);

	const response = await fetch("https://35.175.103.175/api/upload", {
			method: "POST",
			body: form,
	});
	
	console.log("Retorno: "+response.status);
}

// converter canvas em Blob via Promise
function canvasToBlob(canvas, type = 'image/png', quality = 1) {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => {
			resolve(blob);
		}, type, quality);
	});
}

// === EVENTOS PRINCIPAIS ===
startCameraBtn.addEventListener('click', async () => {
	await getCameraStream();
	startCameraContainer.style.display = 'none';
});

shutterBtn.addEventListener('click', capturePhoto);

switchCamBtn.addEventListener('click', async () => {
	const cameras = await listCameras();
	if (cameras.length <= 1) return;
	const currentIndex = cameras.findIndex(c => c.deviceId === currentDeviceId);
	const nextIndex = (currentIndex + 1) % cameras.length;
	await getCameraStream(cameras[nextIndex].deviceId);
});

zoomSlider.addEventListener('input', updateZoom);
resetBtn.addEventListener('click', resetCameraSettings);

filtersBtnContainer.addEventListener('click', () => {
  filtersPanel.classList.toggle('hidden');
});

filterBtns.forEach(btn => {
	btn.addEventListener('click', () => {
		const filter = btn.dataset.filter;
		const label = btn.textContent;
		applyFilter(filter, label);
		btn.classList.add('active');
	});
});
