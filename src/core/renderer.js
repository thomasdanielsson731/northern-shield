const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
	const dpr = window.devicePixelRatio || 1;
	const width = window.innerWidth;
	const height = window.innerHeight;

	canvas.width = Math.floor(width * dpr);
	canvas.height = Math.floor(height * dpr);
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;

	// Reset transform each resize to avoid compounding scale.
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

export { canvas, ctx };
