// Pets Escalón - Sistema de gestión de mascotas
// Código adaptado para funcionar con Supabase

class PetsManager {
    constructor() {
        // Claves de tu proyecto "Pets Escalon"
        const supabaseUrl = 'https://zsxsnfpeztegtabzcvbv.supabase.co';
        // ¡IMPORTANTE! Reemplaza la siguiente línea con tu propia llave pública de Supabase
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeHNuZnBlenRlZ3RhYnpjdmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQwMzYsImV4cCI6MjA2ODY3MDAzNn0.kFZSb0_6moaIMpA2Ijs2oYGtOzCNbpDwEX_FV6RYjMo'; 

        // Inicializa el cliente de Supabase
        this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
        
        this.selectedImages = [];
        this.maxImages = 5;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPageContent();
    }

    setupEventListeners() {
        // Inicializar tooltips de Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        // Setup específico por página
        if (document.getElementById('catalogo-mascotas')) this.setupCatalogPage();
        if (document.getElementById('petRegistrationForm')) this.setupRegistrationPage();
    }

    setupCatalogPage() {
        this.loadCatalog();
        this.setupFilters();
    }

    setupRegistrationPage() {
        this.setupImageUpload();
        this.setupFormValidation();
        // El evento de submit se maneja directamente en setupFormValidation
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

    // ====================================================
    // MÉTODOS DE API CON SUPABASE (NUEVO)
    // ====================================================

    async getPets() {
        try {
            const { data, error } = await this.supabase
                .from('mascotas')
                .select('*')
                .order('created_at', { ascending: false }); // Ordena por más recientes

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error al obtener mascotas:', error);
            this.showAlert('No se pudieron cargar las mascotas.', 'danger');
            return null;
        }
    }

    async deletePetById(id) {
        // Opcional: Primero podrías buscar la mascota para obtener las URLs de las imágenes y eliminarlas del Storage.
        try {
            const { error } = await this.supabase
                .from('mascotas')
                .delete()
                .eq('id', id); // eq = equals (igual a)

            if (error) throw error;

            this.showAlert('Mascota eliminada correctamente', 'success');
            this.loadCatalog(); // Recargar el catálogo para reflejar el cambio
        } catch (error) {
            console.error('Error al eliminar mascota:', error);
            this.showAlert('Error al eliminar la mascota.', 'danger');
        }
    }


    // ====================================================
    // MÉTODOS DE UI (SIN CAMBIOS IMPORTANTES)
    // ====================================================

    showAlert(message, type = 'info', autoHide = true) {
        const alertContainer = document.querySelector('main');
        if (!alertContainer) return;
        const alertId = `alert-${Date.now()}`;
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert" style="position: fixed; top: 80px; right: 20px; z-index: 1050;">
                <i class="bi bi-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHTML);
        
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
        let loading = document.getElementById('loading-overlay');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loading-overlay';
            loading.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
            loading.innerHTML = '<div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.body.appendChild(loading);
        }
        loading.style.display = show ? 'flex' : 'none';
    }

    // ====================================================
    // MÉTODOS DEL CATÁLOGO (ACTUALIZADO)
    // ====================================================

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
        // Usamos la primera imagen del arreglo. Si no hay, ponemos una por defecto.
        const imageUrl = pet.imagenes && pet.imagenes.length > 0
            ? pet.imagenes[0]
            : 'https://placehold.co/400x300/e1e1e1/666?text=Sin+Foto';

        return `
            <div class="col-lg-4 col-md-6 mb-4 fade-in-up">
                <div class="card h-100 border-0 shadow-sm">
                    <img src="${imageUrl}" class="card-img-top" alt="Foto de ${pet.nombre}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h5 class="card-title text-primary">
                            <i class="bi bi-heart-fill text-danger me-2"></i>
                            ${pet.nombre}
                        </h5>
                        <div class="row g-2 mb-3">
                            <div class="col-6"><small class="text-muted">Especie:</small><br><strong>${speciesName}</strong></div>
                            <div class="col-6"><small class="text-muted">Raza:</small><br><strong>${pet.tipo_raza}</strong></div>
                            <div class="col-6"><small class="text-muted">Peso:</small><br><span class="badge bg-info">${pet.peso} kg</span></div>
                            <div class="col-6"><small class="text-muted">Edad:</small><br><span class="badge bg-warning text-dark">${pet.edad} ${pet.edad === 1 ? 'año' : 'años'}</span></div>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-0">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="petsManager.viewDetails(${pet.id})" data-bs-toggle="tooltip" title="Ver detalles"><i class="bi bi-eye"></i></button>
                            <button class="btn btn-success btn-sm" onclick="petsManager.adoptPet(${pet.id})" data-bs-toggle="tooltip" title="Adoptar"><i class="bi bi-house-heart"></i></button>
                            <button class="btn btn-warning btn-sm" onclick="petsManager.editPet(${pet.id})" data-bs-toggle="tooltip" title="Editar"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="petsManager.confirmDelete(${pet.id})" data-bs-toggle="tooltip" title="Eliminar"><i class="bi bi-trash"></i></button>
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
        return species[String(speciesId)] || 'Desconocida';
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

    // ====================================================
    // ACCIONES DE MASCOTA (ACTUALIZADO)
    // ====================================================

    viewDetails(id) {
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
        if (confirm('¿Estás seguro de que quieres eliminar esta mascota? Esta acción no se puede deshacer.')) {
            this.deletePetById(id);
        }
    }

    // ====================================================
    // MÉTODOS DE CARGA DE IMÁGENES (SIN CAMBIOS)
    // ====================================================

    setupImageUpload() {
        const imageInput = document.getElementById('imagenes');
        const uploadArea = document.getElementById('uploadArea');
        if (!imageInput || !uploadArea) return;

        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => this.handleDragEvent(e, eventName));
        });

        // Event listener SOLO para el botón
        const uploadButton = uploadArea.querySelector('button');
        if (uploadButton) {
            uploadButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                imageInput.click();
            });
        }

        imageInput.addEventListener('change', (e) => this.handleImageFiles(Array.from(e.target.files)));
    }

    handleDragEvent(e, eventType) {
        e.preventDefault();
        const uploadArea = e.currentTarget;
        if (eventType === 'dragover') uploadArea.classList.add('drag-over');
        else if (eventType === 'dragleave') uploadArea.classList.remove('drag-over');
        else if (eventType === 'drop') {
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
            this.showAlert('Por favor selecciona archivos de imagen válidos.', 'warning');
            return false;
        }
        if (this.selectedImages.length + files.length > this.maxImages) {
            this.showAlert(`Solo puedes seleccionar hasta ${this.maxImages} imágenes.`, 'warning');
            return false;
        }
        const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
        if (invalidFiles.length > 0) {
            this.showAlert('Algunas imágenes son demasiado grandes (máximo 5MB).', 'danger');
            return false;
        }
        return true;
    }

    addImageToCollection(file) {
        const imageData = { id: `${Date.now()}-${Math.random()}`, file, url: URL.createObjectURL(file) };
        this.selectedImages.push(imageData);
    }

    updateImageDisplay() {
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const uploadPreview = document.getElementById('uploadPreview');
        const imagesGrid = document.getElementById('imagesGrid');
        const imageCount = document.getElementById('imageCount');

        if (this.selectedImages.length === 0) {
            uploadPlaceholder.style.display = 'block';
            uploadPreview.style.display = 'none';
        } else {
            uploadPlaceholder.style.display = 'none';
            uploadPreview.style.display = 'block';
            imageCount.textContent = this.selectedImages.length;
            imagesGrid.innerHTML = this.selectedImages.map((img, index) => `
                <div class="image-item" data-id="${img.id}">
                    <img src="${img.url}" alt="Imagen ${index + 1}" class="img-fluid">
                    <div class="image-overlay">
                        <button type="button" class="btn btn-sm btn-danger" onclick="petsManager.removeImage('${img.id}')"><i class="bi bi-trash-fill"></i></button>
                        ${index === 0 ? '<span class="badge bg-primary position-absolute top-0 start-0 m-2">Principal</span>' : ''}
                    </div>
                </div>`).join('');
        }
    }

    removeImage(imageId) {
        const image = this.selectedImages.find(img => img.id === imageId);
        if (image) URL.revokeObjectURL(image.url);
        this.selectedImages = this.selectedImages.filter(img => img.id !== imageId);
        this.updateImageDisplay();
    }

    removeAllImages() {
        this.selectedImages.forEach(img => URL.revokeObjectURL(img.url));
        this.selectedImages = [];
        document.getElementById('imagenes').value = '';
        this.updateImageDisplay();
    }

    // ====================================================
    // MÉTODOS DE FORMULARIO (ACTUALIZADO)
    // ====================================================

    setupFormValidation() {
        const form = document.getElementById('petRegistrationForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (form.checkValidity() === false) {
                form.classList.add('was-validated');
                return;
            }
            form.classList.add('was-validated');
            this.handleRegistration(e);
        });
    }

    async handleRegistration(event) {
        if (!this.validateForm()) return;

        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);

        try {
            // 1. Subir imágenes al Storage
            const imageUrls = [];
            for (const imageData of this.selectedImages) {
                const file = imageData.file;
                const fileName = `${Date.now()}_${file.name}`;
                
                const { error: uploadError } = await this.supabase.storage
                    .from('fotos_mascotas') // Nombre de tu bucket
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Obtenemos la URL pública de la imagen subida
                const { data } = this.supabase.storage
                    .from('fotos_mascotas')
                    .getPublicUrl(fileName);
                
                imageUrls.push(data.publicUrl);
            }

            // 2. Insertar los datos en la tabla 'mascotas'
            const formData = new FormData(form);
            const { error: insertError } = await this.supabase
                .from('mascotas')
                .insert([{
                    nombre: formData.get('nombre'),
                    especie: parseInt(formData.get('especie'), 10),
                    tipo_raza: formData.get('tipo_raza'),
                    peso: parseFloat(formData.get('peso')),
                    edad: parseInt(formData.get('edad'), 10),
                    imagenes: imageUrls // Guardamos el arreglo de URLs
                }]);

            if (insertError) throw insertError;
            
            this.showAlert('Mascota registrada correctamente', 'success');
            form.reset();
            this.removeAllImages();
            form.classList.remove('was-validated');

        } catch (error) {
            console.error('Error en el registro:', error);
            this.showAlert(`Error al registrar: ${error.message}`, 'danger');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    validateForm() {
        const imageInput = document.getElementById('imagenes');
        if (this.selectedImages.length === 0) {
            this.showAlert('Debes seleccionar al menos una imagen', 'warning');
            // Marcar el campo como inválido visualmente
            imageInput.setCustomValidity('Debes seleccionar al menos una imagen');
            return false;
        }
        // Limpiar validación personalizada si hay imágenes
        imageInput.setCustomValidity('');
        return true;
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText;
        }
    }

    loadPageContent() {
        if (window.location.pathname.includes('pet-catalog')) {
            document.title = 'Catálogo de Mascotas - Pets Escalón';
        }
    }
}

// Initialize the application
const petsManager = new PetsManager();

// Make it globally accessible if needed for inline onclick events
window.petsManager = petsManager;
