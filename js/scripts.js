// Pets Escalón - Sistema de gestión de mascotas
// Código adaptado para funcionar con Supabase

// Configuración de entorno
const CONFIG = {
    SUPABASE_URL: 'https://zsxsnfpeztegtabzcvbv.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeHNuZnBlenRlZ3RhYnpjdmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQwMzYsImV4cCI6MjA2ODY3MDAzNn0.kFZSb0_6moaIMpA2Ijs2oYGtOzCNbpDwEX_FV6RYjMo',
    PRODUCTION_URL: 'https://jaem.dev/Pets-Escalon',
    isProduction: () => window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
};

class PetsManager {
    constructor() {
        // Inicializa el cliente de Supabase
        this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        
        this.selectedImages = [];
        this.maxImages = 5;
        this.currentUser = null;
        
        // Variables para paginación
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalItems = 0;
        this.totalPages = 0;
        
        // Detectar si estamos en producción o desarrollo
        this.isProduction = CONFIG.isProduction();
        this.baseUrl = this.isProduction ? CONFIG.PRODUCTION_URL : window.location.origin;
        
        console.log(`Modo: ${this.isProduction ? 'Producción' : 'Desarrollo'}`);
        console.log(`Base URL: ${this.baseUrl}`);
        
        this.init();
    }

    async init() {
        await this.checkAuthState();
        this.setupEventListeners();
        this.loadPageContent();
        // Restaurar el estado de los filtros
        this.restoreFiltersState();
    }

    // ====================================================
    // MÉTODOS DE AUTENTICACIÓN (NUEVO)
    // ====================================================

    async checkAuthState() {
        try {
            // Mejorar el manejo de errores de autenticación
            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error) {
                console.warn('Auth check error:', error.message);
                // No mostrar error si es solo que no hay usuario autenticado
                if (!error.message.includes('No JWT present')) {
                    console.error('Error checking auth state:', error);
                }
                this.currentUser = null;
            } else {
                this.currentUser = user;
                console.log('Usuario autenticado:', user?.email || 'Ninguno');
            }
            
            this.updateUIForAuthState();
        } catch (error) {
            console.error('Error checking auth state:', error);
            this.currentUser = null;
            this.updateUIForAuthState();
        }
    }

    updateUIForAuthState() {
        // Actualizar navbar basado en el estado de autenticación
        this.updateNavbar();
        
        // Si estamos en una página que requiere autenticación y no hay usuario
        const protectedPages = ['register-pet.html'];
        const currentPage = window.location.pathname;
        
        if (protectedPages.some(page => currentPage.includes(page)) && !this.currentUser) {
            this.showAlert('Debes iniciar sesión para acceder a esta página.', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    }

    updateNavbar() {
        // Buscar el navbar
        const navbar = document.querySelector('.navbar-nav.ms-auto');
        if (!navbar) return;

        // Limpiar elementos existentes
        navbar.innerHTML = '';

        if (this.currentUser) {
            // Usuario autenticado - mostrar menú de usuario más prominente
            const userMenuHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" 
                       data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-person-circle me-2" style="font-size: 1.2rem;"></i>
                        <span class="d-none d-md-inline">${this.currentUser.email}</span>
                        <span class="d-md-none">Mi Cuenta</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <h6 class="dropdown-header">
                                <i class="bi bi-person me-2"></i>
                                ${this.currentUser.email}
                            </h6>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item" href="register-pet.html">
                                <i class="bi bi-plus-circle me-2"></i>
                                Registrar Mascota
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="pet-catalog.html">
                                <i class="bi bi-grid-3x3-gap me-2"></i>
                                Mis Mascotas
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="#" onclick="petsManager.handleSignOut()">
                                <i class="bi bi-box-arrow-right me-2"></i>
                                Cerrar Sesión
                            </a>
                        </li>
                    </ul>
                </li>
            `;
            navbar.insertAdjacentHTML('beforeend', userMenuHTML);
        } else {
            // Usuario no autenticado - mostrar opciones de login/registro
            const authLinksHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="login.html">
                        <i class="bi bi-box-arrow-in-right me-1"></i>
                        Iniciar Sesión
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link btn btn-outline-primary ms-2 px-3" href="signup.html">
                        <i class="bi bi-person-plus me-1"></i>
                        Registrarse
                    </a>
                </li>
            `;
            navbar.insertAdjacentHTML('beforeend', authLinksHTML);
        }
    }

    async handleSignUp(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    emailRedirectTo: `${this.baseUrl}/login.html`,
                    data: {
                        // Datos adicionales del usuario si los necesitas
                    }
                }
            });
            
            if (error) throw error;
            
            console.log('Signup successful:', data);
            this.showAlert('Registro exitoso. Revisa tu email para confirmar la cuenta.', 'success');
            
            // Redirigir a login después de un momento
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } catch (error) {
            console.error('Signup error:', error);
            this.showAlert(`Error en el registro: ${error.message}`, 'danger');
        }
    }

    async handleSignIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({ 
                email, 
                password 
            });
            
            if (error) throw error;
            
            this.currentUser = data.user;
            console.log('Login successful:', data.user.email);
            this.showAlert('Inicio de sesión exitoso.', 'success');
            
            // Redirigir al catálogo
            setTimeout(() => {
                window.location.href = 'pet-catalog.html';
            }, 1500);
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Error en el inicio de sesión';
            
            // Personalizar mensajes de error
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Debes confirmar tu email antes de iniciar sesión.';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
            } else {
                errorMessage = error.message;
            }
            
            this.showAlert(errorMessage, 'danger');
        }
    }

    async handleSignOut() {
        try {
            await this.supabase.auth.signOut();
            this.currentUser = null;
            this.showAlert('Has cerrado sesión.', 'info');
            
            // Redirigir al inicio - corregir la ruta
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            this.showAlert('Error al cerrar sesión.', 'danger');
        }
    }

    setupEventListeners() {
        // Inicializar tooltips de Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        // Setup específico por página
        if (document.getElementById('catalogo-mascotas')) this.setupCatalogPage();
        if (document.getElementById('petRegistrationForm')) this.setupRegistrationPage();
        if (document.getElementById('loginForm')) this.setupLoginPage();
        if (document.getElementById('signupForm')) this.setupSignupPage();
        
        // Setup para el estado de los filtros
        this.setupFiltersStateManagement();
    }

    setupLoginPage() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (form.checkValidity() === false) {
                form.classList.add('was-validated');
                return;
            }

            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');

            const submitBtn = form.querySelector('button[type="submit"]');
            this.setButtonLoading(submitBtn, true);

            await this.handleSignIn(email, password);
            
            this.setButtonLoading(submitBtn, false);
        });
    }

    setupSignupPage() {
        const form = document.getElementById('signupForm');
        if (!form) return;

        // Validación de contraseñas coincidentes
        const password = form.querySelector('#password');
        const confirmPassword = form.querySelector('#confirmPassword');

        confirmPassword.addEventListener('input', () => {
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Las contraseñas no coinciden');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (form.checkValidity() === false) {
                form.classList.add('was-validated');
                return;
            }

            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');

            const submitBtn = form.querySelector('button[type="submit"]');
            this.setButtonLoading(submitBtn, true);

            await this.handleSignUp(email, password);
            
            this.setButtonLoading(submitBtn, false);
        });
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
        // Event listeners para checkboxes de especies
        const speciesCheckboxes = document.querySelectorAll('#filtro-especies input[type="checkbox"]');
        speciesCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });

        // Hacer clickeable toda el área de los checkboxes de especies
        const speciesFormChecks = document.querySelectorAll('#filtro-especies .form-check');
        speciesFormChecks.forEach(formCheck => {
            formCheck.addEventListener('click', (e) => {
                // Evitar que se dispare dos veces si ya se hizo click en el checkbox o label
                if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') return;
                
                const checkbox = formCheck.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.applyFilters();
                }
            });
            
            // Agregar cursor pointer para indicar que es clickeable
            formCheck.style.cursor = 'pointer';
        });

        // Event listeners para controles deslizantes de edad
        const ageMinSlider = document.getElementById('edad-min');
        const ageMaxSlider = document.getElementById('edad-max');
        
        if (ageMinSlider && ageMaxSlider) {
            ageMinSlider.addEventListener('input', () => {
                this.updateAgeSliders();
                this.applyFilters();
            });
            
            ageMaxSlider.addEventListener('input', () => {
                this.updateAgeSliders();
                this.applyFilters();
            });
            
            // Inicializar valores de los sliders
            this.updateAgeSliders();
        }
    }

    updateAgeSliders() {
        const ageMinSlider = document.getElementById('edad-min');
        const ageMaxSlider = document.getElementById('edad-max');
        const ageMinValue = document.getElementById('edad-min-value');
        const ageMaxValue = document.getElementById('edad-max-value');
        
        if (!ageMinSlider || !ageMaxSlider || !ageMinValue || !ageMaxValue) return;
        
        let minVal = parseInt(ageMinSlider.value);
        let maxVal = parseInt(ageMaxSlider.value);
        
        // Asegurar que min no sea mayor que max
        if (minVal > maxVal) {
            if (ageMinSlider === document.activeElement) {
                maxVal = minVal;
                ageMaxSlider.value = maxVal;
            } else {
                minVal = maxVal;
                ageMinSlider.value = minVal;
            }
        }
        
        // Actualizar los valores mostrados
        ageMinValue.textContent = minVal === 0 ? '0 años' : `${minVal} ${minVal === 1 ? 'año' : 'años'}`;
        ageMaxValue.textContent = maxVal >= 20 ? '20+ años' : `${maxVal} ${maxVal === 1 ? 'año' : 'años'}`;
    }

    // ====================================================
    // MÉTODOS DE API CON SUPABASE (ACTUALIZADO CON PAGINACIÓN)
    // ====================================================

    async getPets(page = 1, filters = {}) {
        try {
            const offset = (page - 1) * this.itemsPerPage;
            
            let query = this.supabase
                .from('mascotas')
                .select('*', { count: 'exact' })
                .eq('disponible', true)
                .order('created_at', { ascending: false });

            // Aplicar filtros si existen
            if (filters.species && filters.species.length > 0) {
                query = query.in('especie', filters.species);
            }
            
            if (filters.breeds && filters.breeds.length > 0) {
                query = query.in('tipo_raza', filters.breeds);
            }
            
            if (filters.ageMin !== undefined && filters.ageMax !== undefined) {
                query = query.gte('edad', filters.ageMin).lte('edad', filters.ageMax);
            }

            // Aplicar paginación
            const { data, error, count } = await query
                .range(offset, offset + this.itemsPerPage - 1);

            if (error) {
                console.error('Database error:', error);
                throw error;
            }
            
            console.log(`Loaded ${data?.length || 0} pets from database`);
            
            this.totalItems = count || 0;
            this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            
            return data;
        } catch (error) {
            console.error('Error al obtener mascotas:', error);
            
            // Proporcionar mensaje más específico según el error
            let errorMessage = 'No se pudieron cargar las mascotas.';
            if (error.message.includes('JWT')) {
                errorMessage = 'Problema de autenticación. Intenta refrescar la página.';
            } else if (error.message.includes('permission')) {
                errorMessage = 'Sin permisos para acceder a los datos.';
            }
            
            this.showAlert(errorMessage, 'danger');
            return null;
        }
    }

    async getAllPetsForFilters() {
        try {
            const { data, error } = await this.supabase
                .from('mascotas')
                .select('tipo_raza')
                .eq('disponible', true);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error al obtener razas:', error);
            return [];
        }
    }

    async deletePetById(id) {
        try {
            // Verificar que el usuario sea el dueño
            const { data: pet, error: fetchError } = await this.supabase
                .from('mascotas')
                .select('user_id')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            if (!this.currentUser || pet.user_id !== this.currentUser.id) {
                this.showAlert('No tienes permisos para eliminar esta mascota.', 'danger');
                return;
            }

            const { error } = await this.supabase
                .from('mascotas')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.showAlert('Mascota eliminada correctamente', 'success');
            this.loadCatalog();
        } catch (error) {
            console.error('Error al eliminar mascota:', error);
            this.showAlert('Error al eliminar la mascota.', 'danger');
        }
    }

    async adoptPet(id) {
        if (!this.currentUser) {
            this.showAlert('Debes iniciar sesión para adoptar una mascota.', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        if (confirm('¿Estás seguro de que quieres adoptar esta mascota?')) {
            try {
                // Crear registro de adopción
                const { error: adoptionError } = await this.supabase
                    .from('adopciones')
                    .insert([{
                        mascota_id: id,
                        adoptante_id: this.currentUser.id
                    }]);

                if (adoptionError) throw adoptionError;

                // Marcar mascota como no disponible
                const { error: updateError } = await this.supabase
                    .from('mascotas')
                    .update({ disponible: false })
                    .eq('id', id);

                if (updateError) throw updateError;

                this.showAlert('¡Felicidades! Has adoptado la mascota exitosamente.', 'success');
                this.loadCatalog(); // Recargar para remover la mascota adoptada
            } catch (error) {
                console.error('Error en adopción:', error);
                this.showAlert('Error al procesar la adopción.', 'danger');
            }
        }
    }

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
        let loading = document.getElementById('loading');
        if (!loading) {
            // Crear loading overlay si no existe
            loading = document.createElement('div');
            loading.id = 'loading-overlay';
            loading.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
            loading.innerHTML = '<div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.body.appendChild(loading);
        } else {
            // Usar el loading existente del HTML
            loading.style.display = show ? 'block' : 'none';
        }
    }

    // ====================================================
    // MÉTODOS DEL CATÁLOGO (ACTUALIZADO)
    // ====================================================

    async loadCatalog(page = 1) {
        this.showLoading(true);
        this.currentPage = page;
        
        // Obtener filtros actuales
        const filters = this.getCurrentFilters();
        
        const pets = await this.getPets(page, filters) || [];
        this.renderPetCards(pets);
        this.updatePagination();
        
        // Cargar razas para filtros solo en la primera página
        if (page === 1) {
            const allPetsForFilters = await this.getAllPetsForFilters();
            this.populateBreedFilterFromAll(allPetsForFilters);
        }
        
        this.showLoading(false);
    }

    getCurrentFilters() {
        const selectedSpecies = Array.from(document.querySelectorAll('#filtro-especies input[type="checkbox"]:checked'))
            .map(checkbox => parseInt(checkbox.value));
        
        const selectedBreeds = Array.from(document.querySelectorAll('#filtro-razas input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        const ageMin = parseInt(document.getElementById('edad-min')?.value) || 0;
        const ageMax = parseInt(document.getElementById('edad-max')?.value) || 20;
        
        return {
            species: selectedSpecies.length > 0 ? selectedSpecies : undefined,
            breeds: selectedBreeds.length > 0 ? selectedBreeds : undefined,
            ageMin: ageMin > 0 || ageMax < 20 ? ageMin : undefined,
            ageMax: ageMin > 0 || ageMax < 20 ? ageMax : undefined
        };
    }

    populateBreedFilterFromAll(allPets) {
        const breedFilterContainer = document.getElementById('filtro-razas');
        if (!breedFilterContainer) return;

        // Obtener todas las razas únicas de todas las mascotas
        const breeds = [...new Set(allPets.map(pet => pet.tipo_raza).filter(breed => breed))].sort();
        
        // Limpiar contenedor
        breedFilterContainer.innerHTML = '';
        
        // Agregar checkboxes de razas
        breeds.forEach(breed => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';
            checkboxDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${breed}" id="raza-${breed.replace(/\s+/g, '-')}">
                <label class="form-check-label" for="raza-${breed.replace(/\s+/g, '-')}">
                    ${breed}
                </label>
            `;
            breedFilterContainer.appendChild(checkboxDiv);
            
            // Agregar event listener al checkbox
            const checkbox = checkboxDiv.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => this.applyFilters());
            
            // Hacer clickeable toda el área del checkbox de raza
            checkboxDiv.addEventListener('click', (e) => {
                // Evitar que se dispare dos veces si ya se hizo click en el checkbox o label
                if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') return;
                
                checkbox.checked = !checkbox.checked;
                this.applyFilters();
            });
            
            // Agregar cursor pointer para indicar que es clickeable
            checkboxDiv.style.cursor = 'pointer';
        });
    }

    renderPetCards(pets) {
        const container = document.getElementById('catalogo-mascotas');
        const noPetsMessage = document.getElementById('sin-mascotas');
        const paginationContainer = document.getElementById('pagination-container');
        
        if (!container) return;

        if (pets.length === 0 && this.totalItems === 0) {
            container.innerHTML = '';
            if (noPetsMessage) noPetsMessage.style.display = 'block';
            if (paginationContainer) paginationContainer.style.display = 'none';
            this.updateResultsCounter(0);
            return;
        }

        if (noPetsMessage) noPetsMessage.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'block';
        
        container.innerHTML = pets.map(pet => this.createPetCard(pet)).join('');
        this.updatePaginationInfo();
        // Actualizar contador con el total de mascotas encontradas (no solo las de esta página)
        this.updateResultsCounter(this.totalItems);
    }

    createPetCard(pet) {
        const speciesName = this.getSpeciesName(pet.especie);
        const imageUrl = pet.imagenes && pet.imagenes.length > 0
            ? pet.imagenes[0]
            : 'https://placehold.co/400x300/e1e1e1/666?text=Sin+Foto';

        // Determinar qué botones mostrar basado en el usuario actual
        let actionButtons = '';
        
        if (this.currentUser) {
            if (this.currentUser.id === pet.user_id) {
                // Es el dueño - mostrar editar y eliminar
                actionButtons = `
                    <button class="btn btn-warning btn-sm" onclick="petsManager.editPet(${pet.id})" data-bs-toggle="tooltip" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="petsManager.confirmDelete(${pet.id})" data-bs-toggle="tooltip" title="Eliminar"><i class="bi bi-trash"></i></button>
                `;
            } else {
                // No es el dueño - mostrar adoptar
                actionButtons = `
                    <button class="btn btn-success btn-sm" onclick="petsManager.adoptPet(${pet.id})" data-bs-toggle="tooltip" title="Adoptar"><i class="bi bi-house-heart"></i></button>
                `;
            }
        } else {
            // No está logueado - solo ver detalles
            actionButtons = `
                <button class="btn btn-outline-secondary btn-sm" onclick="petsManager.showLoginRequired()" data-bs-toggle="tooltip" title="Inicia sesión para adoptar"><i class="bi bi-house-heart"></i></button>
            `;
        }

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
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showLoginRequired() {
        this.showAlert('Debes iniciar sesión para adoptar mascotas.', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }

    getSpeciesName(speciesId) {
        const species = {
            1: 'Perro', 2: 'Gato', 3: 'Perico', 
            4: 'Tortuga', 5: 'Rata', 6: 'Pez'
        };
        return species[String(speciesId)] || 'Desconocida';
    }

    filterPets() {
        // Obtener especies seleccionadas
        const selectedSpecies = Array.from(document.querySelectorAll('#filtro-especies input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        // Obtener razas seleccionadas
        const selectedBreeds = Array.from(document.querySelectorAll('#filtro-razas input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        // Obtener rango de edad
        const ageMin = parseInt(document.getElementById('edad-min')?.value) || 0;
        const ageMax = parseInt(document.getElementById('edad-max')?.value) || 20;
        
        const cards = document.querySelectorAll('#catalogo-mascotas .col-lg-4');
        let visibleCount = 0;
        
        cards.forEach(card => {
            const cardData = this.extractCardData(card);
            
            // Verificar cada filtro
            const matchesSpecies = selectedSpecies.length === 0 || 
                                  selectedSpecies.includes(cardData.especie.toString());
            
            const matchesBreed = selectedBreeds.length === 0 || 
                                selectedBreeds.includes(cardData.raza);
            
            const matchesAge = cardData.edad >= ageMin && cardData.edad <= ageMax;
            
            // Mostrar solo si coincide con todos los filtros
            const shouldShow = matchesSpecies && matchesBreed && matchesAge;
            card.style.display = shouldShow ? 'block' : 'none';
            
            if (shouldShow) visibleCount++;
        });
        
        this.updateResultsCounter(visibleCount);
    }

    extractCardData(card) {
        // Extraer datos de la tarjeta para filtrado
        const cardBody = card.querySelector('.card-body');
        const rows = cardBody.querySelectorAll('.row .col-6');
        
        let especie = '';
        let raza = '';
        let edad = 0;
        
        rows.forEach(col => {
            const text = col.textContent;
            if (text.includes('Especie:')) {
                const speciesText = col.querySelector('strong').textContent;
                // Convertir nombre de especie a ID
                const speciesMap = {
                    'Perro': '1', 'Gato': '2', 'Perico': '3', 
                    'Tortuga': '4', 'Rata': '5', 'Pez': '6'
                };
                especie = speciesMap[speciesText] || '';
            } else if (text.includes('Raza:')) {
                raza = col.querySelector('strong').textContent;
            } else if (text.includes('Edad:')) {
                const ageText = col.querySelector('.badge').textContent;
                edad = parseInt(ageText.match(/\d+/)?.[0]) || 0;
            }
        });
        
        return { especie, raza, edad };
    }

    clearFilters() {
        // Desmarcar todos los checkboxes de especies
        const speciesCheckboxes = document.querySelectorAll('#filtro-especies input[type="checkbox"]');
        speciesCheckboxes.forEach(checkbox => checkbox.checked = false);
        
        // Desmarcar todos los checkboxes de razas
        const breedCheckboxes = document.querySelectorAll('#filtro-razas input[type="checkbox"]');
        breedCheckboxes.forEach(checkbox => checkbox.checked = false);
        
        // Resetear sliders de edad
        const ageMinSlider = document.getElementById('edad-min');
        const ageMaxSlider = document.getElementById('edad-max');
        if (ageMinSlider && ageMaxSlider) {
            ageMinSlider.value = 0;
            ageMaxSlider.value = 20;
            this.updateAgeSliders();
        }
        
        // Aplicar filtros (resetear a página 1 y recargar)
        this.applyFilters();
        
        // Mostrar mensaje de confirmación
        this.showAlert('Filtros limpiados exitosamente', 'info');
    }

    updateResultsCounter(totalFound) {
        const counter = document.getElementById('resultados-contador');
        if (!counter) return;
        
        // Verificar si hay filtros activos
        const filters = this.getCurrentFilters();
        const hasActiveFilters = (filters.species && filters.species.length > 0) ||
                                (filters.breeds && filters.breeds.length > 0) ||
                                (filters.ageMin !== undefined && filters.ageMax !== undefined && 
                                 (filters.ageMin > 0 || filters.ageMax < 20));
        
        if (totalFound === 0) {
            if (hasActiveFilters) {
                counter.innerHTML = '<i class="bi bi-exclamation-triangle text-warning me-1"></i>No se encontraron mascotas con estos filtros';
                counter.className = 'text-warning fw-semibold';
            } else {
                counter.innerHTML = '<i class="bi bi-info-circle text-muted me-1"></i>No hay mascotas registradas';
                counter.className = 'text-muted';
            }
        } else {
            if (hasActiveFilters) {
                const filterDescription = this.getFilterDescription(filters);
                counter.innerHTML = `<i class="bi bi-funnel text-primary me-1"></i>Se encontraron <strong>${totalFound}</strong> mascotas${filterDescription}`;
                counter.className = 'text-primary fw-semibold';
            } else {
                counter.innerHTML = `<i class="bi bi-check-circle text-success me-1"></i>Total de mascotas registradas: <strong>${totalFound}</strong>`;
                counter.className = 'text-success fw-semibold';
            }
        }
    }

    getFilterDescription(filters) {
        const descriptions = [];
        
        if (filters.species && filters.species.length > 0) {
            const speciesNames = filters.species.map(id => this.getSpeciesName(id));
            descriptions.push(`especies: ${speciesNames.join(', ')}`);
        }
        
        if (filters.breeds && filters.breeds.length > 0) {
            descriptions.push(`razas: ${filters.breeds.join(', ')}`);
        }
        
        if (filters.ageMin !== undefined && filters.ageMax !== undefined && 
            (filters.ageMin > 0 || filters.ageMax < 20)) {
            if (filters.ageMin === filters.ageMax) {
                descriptions.push(`edad: ${filters.ageMin} ${filters.ageMin === 1 ? 'año' : 'años'}`);
            } else {
                descriptions.push(`edad: ${filters.ageMin}-${filters.ageMax} años`);
            }
        }
        
        return descriptions.length > 0 ? ` con filtros aplicados (${descriptions.join(', ')})` : '';
    }

    // ====================================================
    // ACCIONES DE MASCOTA (ACTUALIZADO)
    // ====================================================

    viewDetails(id) {
        this.showAlert(`Viendo detalles de la mascota #${id}`, 'info');
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

        // Verificar que el usuario esté autenticado
        if (!this.currentUser) {
            this.showAlert('Debes iniciar sesión para registrar mascotas.', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

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
                    .from('fotos-mascotas') // Nombre de tu bucket
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Obtenemos la URL pública de la imagen subida
                const { data } = this.supabase.storage
                    .from('fotos-mascotas')
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
                    imagenes: imageUrls,
                    user_id: this.currentUser.id, // Asignar al usuario actual
                    disponible: true // Por defecto disponible
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

    // ====================================================
    // MÉTODOS DE PAGINACIÓN
    // ====================================================

    updatePagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer || this.totalPages <= 1) {
            document.getElementById('pagination-container').style.display = 'none';
            return;
        }

        document.getElementById('pagination-container').style.display = 'block';
        
        let paginationHTML = '';
        
        // Botón anterior
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${prevDisabled}">
                <button class="page-link" onclick="petsManager.goToPage(${this.currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i> Anterior
                </button>
            </li>
        `;
        
        // Números de página
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="petsManager.goToPage(1)">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const active = i === this.currentPage ? 'active' : '';
            paginationHTML += `
                <li class="page-item ${active}">
                    <button class="page-link" onclick="petsManager.goToPage(${i})">${i}</button>
                </li>
            `;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="petsManager.goToPage(${this.totalPages})">${this.totalPages}</button>
                </li>
            `;
        }
        
        // Botón siguiente
        const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${nextDisabled}">
                <button class="page-link" onclick="petsManager.goToPage(${this.currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
                    Siguiente <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    }

    updatePaginationInfo() {
        const infoElement = document.getElementById('pagination-info');
        if (!infoElement) return;
        
        if (this.totalItems === 0) {
            infoElement.textContent = 'No hay mascotas disponibles';
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
        
        infoElement.innerHTML = `
            Mostrando <strong>${start}-${end}</strong> de <strong>${this.totalItems}</strong> mascotas
        `;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        // Scroll to top suavemente
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.loadCatalog(page);
    }

    // Actualizar método de filtros para trabajar con paginación
    applyFilters() {
        // Resetear a la primera página cuando se aplican filtros
        this.currentPage = 1;
        this.loadCatalog(1);
    }

    // ====================================================
    // MÉTODOS PARA MANEJO DEL ESTADO DE FILTROS
    // ====================================================

    setupFiltersStateManagement() {
        const filtersCollapse = document.getElementById('filtrosCollapse');
        const filterChevron = document.getElementById('filter-chevron');
        
        if (!filtersCollapse || !filterChevron) return;

        // Escuchar eventos de show/hide del collapse
        filtersCollapse.addEventListener('show.bs.collapse', () => {
            // Guardar estado expandido
            localStorage.setItem('filtersExpanded', 'true');
            // Rotar el chevron
            filterChevron.style.transform = 'rotate(180deg)';
        });

        filtersCollapse.addEventListener('hide.bs.collapse', () => {
            // Guardar estado contraído
            localStorage.setItem('filtersExpanded', 'false');
            // Restaurar el chevron
            filterChevron.style.transform = 'rotate(0deg)';
        });
    }

    restoreFiltersState() {
        const filtersCollapse = document.getElementById('filtrosCollapse');
        const filterChevron = document.getElementById('filter-chevron');
        
        if (!filtersCollapse || !filterChevron) return;

        // Obtener el estado guardado
        const isExpanded = localStorage.getItem('filtersExpanded');
        
        // Si no hay estado guardado, usar el valor por defecto (contraído)
        if (isExpanded === null) {
            localStorage.setItem('filtersExpanded', 'false');
            return;
        }

        // Aplicar el estado guardado
        if (isExpanded === 'true') {
            // Expandir sin animación
            filtersCollapse.classList.add('show');
            filterChevron.style.transform = 'rotate(180deg)';
            
            // Actualizar el aria-expanded del botón
            const filterButton = document.querySelector('[data-bs-target="#filtrosCollapse"]');
            if (filterButton) {
                filterButton.setAttribute('aria-expanded', 'true');
            }
        } else {
            // Asegurar que esté contraído
            filtersCollapse.classList.remove('show');
            filterChevron.style.transform = 'rotate(0deg)';
            
            // Actualizar el aria-expanded del botón
            const filterButton = document.querySelector('[data-bs-target="#filtrosCollapse"]');
            if (filterButton) {
                filterButton.setAttribute('aria-expanded', 'false');
            }
        }
    }
}

// Initialize the application
const petsManager = new PetsManager();

// Make it globally accessible if needed for inline onclick events
window.petsManager = petsManager;
