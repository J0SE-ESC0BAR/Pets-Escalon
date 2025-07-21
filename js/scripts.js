// Pets Escalón - Sistema de gestión de mascotas
// Código refactorizado y optimizado

class PetsManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost/pets-api';
        this.selectedImages = [];
        this.maxImages = 5;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPageContent();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Inicializar tooltips de Bootstrap
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

            // Setup específico por página
            if (document.getElementById('catalogo-mascotas')) this.setupCatalogPage();
            if (document.getElementById('petRegistrationForm')) this.setupRegistrationPage();
        });
    }

    setupCatalogPage() {
        this.loadCatalog();
        this.setupFilters();
    }

    setupRegistrationPage() {
        this.setupImageUpload();
        this.setupFormValidation();
        document.getElementById('petRegistrationForm').addEventListener('submit', (e) => this.handleRegistration(e));
    }

    setupFilters() {
        const filters = ['filtro-especie', 'filtro-nombre'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                const event = filterId.includes('nombre') ? 'input' : 'change';
                element.addEventListener(event, () => this.filterPets());
            }
        });
    }

    // API Methods
    async fetchAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/${endpoint}`, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showAlert('Error de conexión con el servidor', 'danger');
            return null;
        }
    }

    async getPets() {
        return await this.fetchAPI('mascotas.php');
    }

    async registerPet(formData) {
        return await this.fetchAPI('registrar.php', {
            method: 'POST',
            body: formData
        });
    }

    async deletePet(id) {
        return await this.fetchAPI('eliminar.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
    }

    // UI Methods
    showAlert(message, type = 'info', autoHide = true) {
        const alertContainer = document.querySelector('main');
        const alertId = `alert-${Date.now()}`;
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('afterbegin', alertHTML);
        
        if (autoHide) {
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) bootstrap.Alert.getOrCreateInstance(alert).close();
            }, 5000);
        }
    }

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle-fill',
            danger: 'exclamation-triangle-fill',
            warning: 'exclamation-circle-fill',
            info: 'info-circle-fill'
        };
        return icons[type] || 'info-circle-fill';
    }

    showLoading(show = true) {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = show ? 'block' : 'none';
    }

    // Catalog Methods
    async loadCatalog() {
        this.showLoading(true);
        const pets = await this.getPets() || [];
        this.renderPetCards(pets);
        this.showLoading(false);
    }

    renderPetCards(pets) {
        const container = document.getElementById('catalogo-mascotas');
        const noPetsMessage = document.getElementById('sin-mascotas');
        
        if (!container) return;

        if (pets.length === 0) {
            container.innerHTML = '';
            if (noPetsMessage) noPetsMessage.style.display = 'block';
            return;
        }

        if (noPetsMessage) noPetsMessage.style.display = 'none';
        
        container.innerHTML = pets.map(pet => this.createPetCard(pet)).join('');
    }

    createPetCard(pet) {
        const speciesName = this.getSpeciesName(pet.especie);
        return `
            <div class="col-lg-4 col-md-6 mb-4 fade-in-up">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-primary">
                            <i class="bi bi-heart-fill text-danger me-2"></i>
                            ${pet.nombre}
                        </h5>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <small class="text-muted">Especie:</small><br>
                                <strong>${speciesName}</strong>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Raza:</small><br>
                                <strong>${pet.tipo_raza}</strong>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Peso:</small><br>
                                <span class="badge bg-info">${pet.peso} kg</span>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Edad:</small><br>
                                <span class="badge bg-warning text-dark">${pet.edad} ${pet.edad === 1 ? 'año' : 'años'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-0">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="petsManager.viewDetails(${pet.id})" 
                                    data-bs-toggle="tooltip" title="Ver detalles">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="petsManager.adoptPet(${pet.id})"
                                    data-bs-toggle="tooltip" title="Adoptar">
                                <i class="bi bi-house-heart"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="petsManager.editPet(${pet.id})"
                                    data-bs-toggle="tooltip" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="petsManager.confirmDelete(${pet.id})"
                                    data-bs-toggle="tooltip" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSpeciesName(speciesId) {
        const species = {
            1: 'Perro', 2: 'Gato', 3: 'Perico', 
            4: 'Tortuga', 5: 'Rata', 6: 'Pez'
        };
        return species[speciesId] || 'Desconocida';
    }

    filterPets() {
        const speciesFilter = document.getElementById('filtro-especie')?.value;
        const nameFilter = document.getElementById('filtro-nombre')?.value.toLowerCase();
        const cards = document.querySelectorAll('#catalogo-mascotas .col-lg-4');
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const content = card.querySelector('.card-body').textContent.toLowerCase();
            
            const matchesName = !nameFilter || title.includes(nameFilter);
            const matchesSpecies = !speciesFilter || speciesFilter === 'todas' || 
                                  content.includes(this.getSpeciesName(speciesFilter).toLowerCase());
            
            card.style.display = matchesName && matchesSpecies ? 'block' : 'none';
        });
    }

    // Pet Actions
    viewDetails(id) {
        // TODO: Implementar modal de detalles
        this.showAlert(`Viendo detalles de la mascota #${id}`, 'info');
    }

    adoptPet(id) {
        if (confirm('¿Estás seguro de que quieres adoptar esta mascota?')) {
            this.showAlert(`¡Felicidades! Has iniciado el proceso de adopción para la mascota #${id}`, 'success');
        }
    }

    editPet(id) {
        window.location.href = `register-pet.html?edit=${id}`;
    }

    confirmDelete(id) {
        const modal = new bootstrap.Modal(document.createElement('div'));
        // TODO: Crear modal de confirmación más elegante
        if (confirm('¿Estás seguro de que quieres eliminar esta mascota?')) {
            this.deletePetById(id);
        }
    }

    async deletePetById(id) {
        const result = await this.deletePet(id);
        if (result?.success) {
            this.showAlert('Mascota eliminada correctamente', 'success');
            this.loadCatalog();
        }
    }

    // Image Upload Methods
    setupImageUpload() {
        const imageInput = document.getElementById('imagenes');
        const uploadArea = document.getElementById('uploadArea');
        
        if (!imageInput || !uploadArea) return;

        // Drag & Drop events
        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => this.handleDragEvent(e, eventName));
        });

        // Click and file input events
        uploadArea.addEventListener('click', (e) => {
            if (!e.target.closest('button')) imageInput.click();
        });

        imageInput.addEventListener('change', (e) => {
            this.handleImageFiles(Array.from(e.target.files));
        });
    }

    handleDragEvent(e, eventType) {
        e.preventDefault();
        const uploadArea = e.currentTarget;
        
        if (eventType === 'dragover') {
            uploadArea.classList.add('drag-over');
        } else if (eventType === 'dragleave') {
            uploadArea.classList.remove('drag-over');
        } else if (eventType === 'drop') {
            uploadArea.classList.remove('drag-over');
            this.handleImageFiles(Array.from(e.dataTransfer.files));
        }
    }

    handleImageFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (!this.validateImageFiles(imageFiles)) return;

        imageFiles.forEach(file => this.addImageToCollection(file));
        this.updateImageDisplay();
    }

    validateImageFiles(files) {
        if (files.length === 0) {
            this.showAlert('Por favor selecciona archivos de imagen válidos', 'warning');
            return false;
        }

        if (this.selectedImages.length + files.length > this.maxImages) {
            this.showAlert(`Solo puedes seleccionar hasta ${this.maxImages} imágenes`, 'warning');
            return false;
        }

        const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
        if (invalidFiles.length > 0) {
            this.showAlert('Algunas imágenes son demasiado grandes (máximo 5MB)', 'danger');
            return false;
        }

        return true;
    }

    addImageToCollection(file) {
        const imageData = {
            id: Date.now() + Math.random(),
            file: file,
            url: null
        };

        const reader = new FileReader();
        reader.onload = (e) => {
            imageData.url = e.target.result;
            this.updateImageDisplay();
        };
        reader.readAsDataURL(file);

        this.selectedImages.push(imageData);
    }

    updateImageDisplay() {
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const uploadPreview = document.getElementById('uploadPreview');
        const imagesGrid = document.getElementById('imagesGrid');
        const imageCount = document.getElementById('imageCount');
        const uploadArea = document.getElementById('uploadArea');

        uploadArea.setAttribute('data-image-count', this.selectedImages.length);

        if (this.selectedImages.length === 0) {
            uploadPlaceholder.style.display = 'block';
            uploadPreview.style.display = 'none';
            return;
        }

        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'block';
        imageCount.textContent = this.selectedImages.length;

        imagesGrid.innerHTML = this.selectedImages.map((img, index) => `
            <div class="image-item" data-id="${img.id}">
                <img src="${img.url}" alt="Imagen ${index + 1}" class="img-fluid">
                <div class="image-overlay">
                    <button type="button" class="btn btn-sm btn-danger" onclick="petsManager.removeImage('${img.id}')">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                    ${index === 0 ? '<span class="badge bg-primary position-absolute top-0 start-0 m-2">Principal</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    removeImage(imageId) {
        this.selectedImages = this.selectedImages.filter(img => img.id !== imageId);
        this.updateImageDisplay();
    }

    removeAllImages() {
        this.selectedImages = [];
        this.updateImageDisplay();
        document.getElementById('imagenes').value = '';
    }

    // Form Methods
    setupFormValidation() {
        const form = document.getElementById('petRegistrationForm');
        if (!form) return;

        // Bootstrap validation
        form.addEventListener('submit', (e) => {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    }

    async handleRegistration(event) {
        event.preventDefault();
        
        if (!this.validateForm()) return;

        const formData = this.buildFormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        this.setButtonLoading(submitBtn, true);

        try {
            const result = await this.registerPet(formData);
            
            if (result?.success) {
                this.showAlert(`Mascota registrada con ${this.selectedImages.length} imagen(es)`, 'success');
                event.target.reset();
                this.removeAllImages();
                event.target.classList.remove('was-validated');
            } else {
                throw new Error(result?.message || 'Error desconocido');
            }
        } catch (error) {
            this.showAlert('Error al registrar la mascota: ' + error.message, 'danger');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    validateForm() {
        if (this.selectedImages.length === 0) {
            this.showAlert('Debes seleccionar al menos una imagen', 'warning');
            return false;
        }
        return true;
    }

    buildFormData(form) {
        const formData = new FormData(form);
        
        // Add images
        this.selectedImages.forEach((imageData, index) => {
            formData.append(`imagen_${index}`, imageData.file);
        });
        formData.append('total_imagenes', this.selectedImages.length);

        return formData;
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Procesando...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText;
        }
    }

    loadPageContent() {
        // Método para cargar contenido específico de cada página
        if (window.location.pathname.includes('pet-catalog')) {
            document.title = 'Catálogo de Mascotas - Pets Escalón';
        }
    }
}

// Initialize the application
const petsManager = new PetsManager();

// Global functions for backward compatibility
window.petsManager = petsManager;