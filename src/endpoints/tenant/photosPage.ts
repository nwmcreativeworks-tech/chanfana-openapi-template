import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";

export class TenantPhotosPage extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Tenant"],
		summary: "Tenant service photos upload page",
		responses: {
			"200": {
				description: "Returns tenant photos HTML page",
			},
		},
	};

	async handle(c: Context) {
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Service Photos - Tenant Portal</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script>
		let userId = null;

		// Authentication check
		(async function checkAuth() {
			const sessionToken = localStorage.getItem('session_token');
			const userRole = localStorage.getItem('user_role');
			userId = localStorage.getItem('user_id');

			if (!sessionToken || userRole !== 'tenant') {
				window.location.href = '/login';
				return;
			}

			// Load photos
			if (userId) {
				loadPhotos(userId);
			}
		})();

		async function loadPhotos(userId) {
			const response = await fetch(\`/tenant/api/service-photos?userId=\${userId}\`);
			const data = await response.json();

			const photosGallery = document.getElementById('photosGallery');
			photosGallery.innerHTML = '';

			if (!data.success || data.photos.length === 0) {
				photosGallery.innerHTML = '<div class="empty-state">📸 No photos uploaded yet. Use the form above to upload your first photos.</div>';
				return;
			}

			data.photos.forEach(photo => {
				const photoCard = document.createElement('div');
				photoCard.className = 'photo-card';

				const phaseBadge = {
					before: { text: 'Before', color: '#FFAB00' },
					after: { text: 'After', color: '#36B37E' },
					unspecified: { text: 'General', color: '#586069' }
				}[photo.phase] || { text: photo.phase, color: '#586069' };

				photoCard.innerHTML = \`
					<img src="\${photo.photo_url}" alt="Service photo" onclick="window.open('\${photo.photo_url}', '_blank')">
					<div class="photo-info">
						<div class="photo-badge" style="background: \${phaseBadge.color}">\${phaseBadge.text}</div>
						<div class="photo-date">\${new Date(photo.uploaded_at).toLocaleDateString()}</div>
						\${photo.request_category ? \`<div class="photo-request">Request: \${photo.request_category}</div>\` : ''}
					</div>
				\`;

				photosGallery.appendChild(photoCard);
			});
		}

		function handlePhotoInput(input) {
			const files = input.files;
			const preview = document.getElementById('photoPreview');
			preview.innerHTML = '';

			if (files.length === 0) return;

			if (files.length > 10) {
				alert('Maximum 10 photos per upload');
				input.value = '';
				return;
			}

			Array.from(files).forEach((file, index) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					const img = document.createElement('img');
					img.src = e.target.result;
					img.className = 'preview-img';
					preview.appendChild(img);
				};
				reader.readAsDataURL(file);
			});

			document.getElementById('uploadSection').style.display = 'block';
		}

		async function uploadPhotos() {
			const fileInput = document.getElementById('photoInput');
			const phase = document.getElementById('photoPhase').value;
			const files = fileInput.files;

			if (files.length === 0) {
				alert('Please select photos to upload');
				return;
			}

			const uploadBtn = document.getElementById('uploadBtn');
			uploadBtn.disabled = true;
			uploadBtn.textContent = 'Uploading...';

			try {
				// Convert files to base64 data URLs
				const photoPromises = Array.from(files).map(file => {
					return new Promise((resolve) => {
						const reader = new FileReader();
						reader.onload = (e) => resolve(e.target.result);
						reader.readAsDataURL(file);
					});
				});

				const photos = await Promise.all(photoPromises);

				// Upload to API
				const response = await fetch('/tenant/api/service-photos', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						userId: parseInt(userId),
						phase: phase,
						photos: photos
					})
				});

				const result = await response.json();

				if (result.success) {
					alert(\`Successfully uploaded \${result.count} photo(s)!\`);
					fileInput.value = '';
					document.getElementById('photoPreview').innerHTML = '';
					document.getElementById('uploadSection').style.display = 'none';
					loadPhotos(userId);
				} else {
					alert('Upload failed: ' + (result.error || 'Unknown error'));
				}
			} catch (error) {
				alert('Upload failed: ' + error.message);
			} finally {
				uploadBtn.disabled = false;
				uploadBtn.textContent = 'Upload Photos';
			}
		}
	</script>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: #F4F5F7;
			min-height: 100vh;
		}
		.header {
			background: linear-gradient(135deg, #00B8D9 0%, #0052CC 100%);
			color: white;
			padding: 24px;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		}
		.header-content {
			max-width: 1000px;
			margin: 0 auto;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.header h1 {
			font-size: 24px;
		}
		.back-btn {
			padding: 8px 16px;
			background: rgba(255, 255, 255, 0.2);
			border: none;
			border-radius: 8px;
			color: white;
			text-decoration: none;
			font-weight: 600;
			transition: all 0.2s;
		}
		.back-btn:hover {
			background: rgba(255, 255, 255, 0.3);
		}
		.container {
			max-width: 1000px;
			margin: 0 auto;
			padding: 32px 20px;
		}
		.upload-card {
			background: white;
			border-radius: 12px;
			padding: 32px;
			margin-bottom: 32px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		}
		.upload-card h2 {
			font-size: 20px;
			color: #0B1F2A;
			margin-bottom: 20px;
		}
		.file-input-wrapper {
			position: relative;
			display: inline-block;
			cursor: pointer;
			margin-bottom: 20px;
		}
		.file-input-label {
			display: inline-block;
			padding: 12px 24px;
			background: #0052CC;
			color: white;
			border-radius: 8px;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s;
		}
		.file-input-label:hover {
			background: #0065FF;
		}
		.file-input {
			position: absolute;
			opacity: 0;
			pointer-events: none;
		}
		.form-group {
			margin-bottom: 20px;
		}
		.form-group label {
			display: block;
			font-weight: 600;
			color: #0B1F2A;
			margin-bottom: 8px;
		}
		.form-group select {
			width: 100%;
			padding: 12px;
			border: 2px solid #E1E4E8;
			border-radius: 8px;
			font-size: 14px;
		}
		.photo-preview {
			display: flex;
			gap: 12px;
			flex-wrap: wrap;
			margin-top: 20px;
		}
		.preview-img {
			width: 120px;
			height: 120px;
			object-fit: cover;
			border-radius: 8px;
			border: 2px solid #E1E4E8;
		}
		.btn {
			padding: 12px 24px;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			transition: all 0.2s;
		}
		.btn-primary {
			background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
			color: white;
			box-shadow: 0 4px 12px rgba(0, 82, 204, 0.2);
		}
		.btn-primary:hover:not(:disabled) {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(0, 82, 204, 0.3);
		}
		.btn-primary:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
		.gallery-title {
			font-size: 20px;
			color: #0B1F2A;
			margin-bottom: 20px;
			font-weight: 700;
		}
		.photos-gallery {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 16px;
		}
		.photo-card {
			background: white;
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
			transition: all 0.2s;
		}
		.photo-card:hover {
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
			transform: translateY(-2px);
		}
		.photo-card img {
			width: 100%;
			height: 200px;
			object-fit: cover;
			cursor: pointer;
		}
		.photo-info {
			padding: 12px;
		}
		.photo-badge {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 12px;
			font-size: 11px;
			font-weight: 700;
			color: white;
			text-transform: uppercase;
			margin-bottom: 8px;
		}
		.photo-date {
			font-size: 13px;
			color: #586069;
			margin-bottom: 4px;
		}
		.photo-request {
			font-size: 12px;
			color: #0052CC;
			font-weight: 600;
		}
		.empty-state {
			text-align: center;
			padding: 60px 20px;
			color: #586069;
			font-size: 16px;
		}
		.info-box {
			background: #E3FCEF;
			border-left: 4px solid #36B37E;
			padding: 16px;
			border-radius: 8px;
			margin-bottom: 20px;
			font-size: 14px;
			color: #0B1F2A;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="header-content">
			<h1>📸 Service Photos</h1>
			<a href="/portal" class="back-btn">← Back to Portal</a>
		</div>
	</div>

	<div class="container">
		<div class="upload-card">
			<h2>Upload Photos</h2>
			<div class="info-box">
				📌 Upload before/after photos for maintenance work or general documentation. Maximum 10 photos per upload.
			</div>

			<div class="file-input-wrapper">
				<label class="file-input-label" for="photoInput">
					📷 Choose Photos (Max 10)
				</label>
				<input type="file" id="photoInput" class="file-input" multiple accept="image/*" onchange="handlePhotoInput(this)">
			</div>

			<div id="photoPreview" class="photo-preview"></div>

			<div id="uploadSection" style="display: none;">
				<div class="form-group">
					<label>Photo Type</label>
					<select id="photoPhase">
						<option value="before">Before Work</option>
						<option value="after">After Work</option>
						<option value="unspecified">General Documentation</option>
					</select>
				</div>

				<button class="btn btn-primary" id="uploadBtn" onclick="uploadPhotos()">Upload Photos</button>
			</div>
		</div>

		<h2 class="gallery-title">Your Uploaded Photos</h2>
		<div class="photos-gallery" id="photosGallery"></div>
	</div>
</body>
</html>`;

		return c.html(html);
	}
}
