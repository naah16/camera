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
const filterBtns = document.querySelectorAll('.filter-btn');
const switchCamBtn = document.getElementById('switch-cam-btn');
const cameraClose = document.querySelector('.btn-close');
const cameraDownload = document.querySelector('.btn-download');
const cameraInfoTopRight = document.querySelector('.top-right');

const constraints = {
	video: {
		facingMode: 'environment',
		pan: true, zoom: true, tilt: true,
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

		handleCameraCapabilities(videoTrack);
	} catch (err) {
		alert('Erro ao acessar a câmera: ' + err.message);
	}
}

function handleCameraCapabilities(track) {
	const capabilities = track.getCapabilities();
	if (capabilities.zoom) {
		flashBtn.onclick = () => {
			torchEnabled = !torchEnabled;
			track.applyConstraints({ advanced: [{ torch: torchEnabled }] });
			flashEffect.style.display = torchEnabled ? 'block' : 'none';
			flashBtn.classList.toggle("active", torchEnabled);
		};
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
		cameraInfoTopRight.style.display = 'flex';
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
	photoCanvas.width = cameraFeed.offsetWidth;
	photoCanvas.height = cameraFeed.offsetHeight;

	const ctx = photoCanvas.getContext('2d');
	if (cameraFeed.style.filter) {
		photoCanvas.style.filter = cameraFeed.style.filter;
	}
	ctx.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);

	cameraFeed.style.display = "none";
	photoCanvas.style.display = "block";
	cameraInfoTopRight.style.display = 'none';

	createActionButtons();
}

function saveImage() {
	photoCanvas.toBlob((blob) => {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'captured-image.png';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}, 'image/png');
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

filterBtns.forEach(btn => {
	btn.addEventListener('click', () => {
		const filter = btn.dataset.filter;
		const label = btn.textContent;
		applyFilter(filter, label);
		btn.classList.add('active');
	});
});
