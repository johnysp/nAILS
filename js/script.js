// ** Configuración de Firebase **
// Reemplaza estos valores con la configuración de tu propio proyecto de Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAzdG0iFMBpZ7tR0TbbL37H590oCe-mrXY",
  authDomain: "lilireserv.firebaseapp.com",
  databaseURL: "https://lilireserv-default-rtdb.firebaseio.com",
  projectId: "lilireserv",
  storageBucket: "lilireserv.firebasestorage.app",
  messagingSenderId: "621407465836",
  appId: "1:621407465836:web:cb5c2942de424654c3c349",
  measurementId: "G-Q51LGF3Z61"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Obtén una referencia a la base de datos de Realtime Database
const database = firebase.database();
const bookingsRef = database.ref('reservas'); // 'reservas' es el nombre de nuestra colección

// Inicializa Firebase Auth
const auth = firebase.auth();


// --- Elementos del DOM del formulario de reserva (solo para index.html) ---
const bookingForm = document.getElementById('bookingForm');
const serviceSelect = document.getElementById('servicio');
const priceDisplay = document.getElementById('precioDisplay');
const messageDiv = document.getElementById('message');

// --- Elementos del DOM para Autenticación (solo para index.html) ---
const authModal = document.getElementById('authModal');
const openAuthModalBtn = document.getElementById('openAuthModal');
const closeAuthModalBtn = authModal.querySelector('.close-button');
const loginTabBtn = document.getElementById('loginTab');
const registerTabBtn = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginMessageDiv = document.getElementById('loginMessage');
const registerMessageDiv = document.getElementById('registerMessage');

// Referencias a los campos de entrada de los formularios de autenticación
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const registerNameInput = document.getElementById('registerName');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');


// --- Función para mostrar mensajes al usuario (para el formulario de reserva principal) ---
function showMessage(msg, type) {
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 5000);
}

// --- Lógica del Modal de Autenticación y funciones de mensajes del modal ---

// Función para mostrar mensajes específicos del modal
function showAuthMessage(divElement, msg, type) {
    divElement.textContent = msg;
    divElement.className = `message ${type}`;
    divElement.style.display = 'block';
    setTimeout(() => {
        divElement.style.display = 'none';
        divElement.textContent = '';
        divElement.className = 'message';
    }, 5000);
}

// Abrir modal
openAuthModalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    authModal.style.display = 'flex'; // Usar 'flex' para mostrar y centrar
});

// Cerrar modal con el botón X
closeAuthModalBtn.addEventListener('click', () => {
    authModal.style.display = 'none';
    loginForm.reset(); // Limpia los formularios al cerrar
    registerForm.reset();
    loginMessageDiv.style.display = 'none'; // Oculta mensajes
    registerMessageDiv.style.display = 'none';
});

// Cerrar modal haciendo clic fuera de él
window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
        loginForm.reset();
        registerForm.reset();
        loginMessageDiv.style.display = 'none';
        registerMessageDiv.style.display = 'none';
    }
});

// Lógica para cambiar entre pestañas de Iniciar Sesión y Registrarse
loginTabBtn.addEventListener('click', () => {
    loginTabBtn.classList.add('active');
    registerTabBtn.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginMessageDiv.style.display = 'none'; // Limpiar mensajes al cambiar de pestaña
    registerMessageDiv.style.display = 'none';
    loginForm.reset(); // Limpiar formulario al cambiar
    registerForm.reset();
});

registerTabBtn.addEventListener('click', () => {
    registerTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    loginMessageDiv.style.display = 'none'; // Limpiar mensajes al cambiar de pestaña
    registerMessageDiv.style.display = 'none';
    loginForm.reset(); // Limpiar formulario al cambiar
    registerForm.reset();
});


// --- Lógica para actualizar el precio al seleccionar un servicio ---
serviceSelect.addEventListener('change', () => {
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    const price = selectedOption.dataset.precio || '0'; // Obtiene el precio o 0 si no hay
    priceDisplay.textContent = `$${price}`;
});

// --- Manejo del envío del formulario de reserva ---
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Previene el envío por defecto del formulario

    const nombre = document.getElementById('nombre').value;
    const fecha = document.getElementById('fecha').value;
    const servicio = serviceSelect.value;
    const hora = document.getElementById('hora').value;
    const precio = parseFloat(serviceSelect.options[serviceSelect.selectedIndex].dataset.precio);

    if (!nombre || !fecha || !servicio || !hora || isNaN(precio)) {
        showMessage('Por favor, completa todos los campos.', 'error');
        return;
    }

    // Crea el objeto de la reserva
    const newBooking = {
        nombreCliente: nombre,
        fechaCita: fecha,
        horaCita: hora,
        servicioSolicitado: servicio,
        precioServicio: precio,
        estado: "pendiente", // Estado inicial de la reserva
        timestampReserva: new Date().toISOString() // Fecha y hora de creación de la reserva
    };

    // Opcional: Si hay un usuario logueado, asocia la reserva a su UID
    const currentUser = auth.currentUser;
    if (currentUser) {
        newBooking.userId = currentUser.uid; // Asocia la reserva al UID del usuario logueado
    }


    try {
        // Guarda la reserva en Firebase Realtime Database
        await bookingsRef.push(newBooking); // 'push()' crea un ID único y añade el objeto
        showMessage('¡Cita agendada con éxito!', 'success');
        bookingForm.reset(); // Limpia el formulario
        priceDisplay.textContent = '$0'; // Reinicia el precio
    } catch (error) {
        console.error("Error al agendar la cita:", error);
        showMessage('Hubo un problema al agendar tu cita. Inténtalo de nuevo.', 'error');
    }
});


// --- Lógica de Autenticación con Firebase (para index.html) ---


// Función para registrar un nuevo usuario
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;
    const name = registerNameInput.value;

    if (password.length < 6) {
        showAuthMessage(registerMessageDiv, 'La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Guardar el nombre, adeudo e is_Admin en Realtime Database asociado al UID del usuario
        await database.ref('usuarios/' + user.uid).set({
            nombre: name,
            email: email,
            fechaRegistro: new Date().toISOString(),
            adeudoTotal: 0,
            isAdmin: false // Por defecto, un nuevo usuario NO es admin
        });

        showAuthMessage(registerMessageDiv, '¡Cuenta creada con éxito! Redirigiendo a tu perfil...', 'success');
        registerForm.reset();
        // Al registrarse con éxito, el onAuthStateChanged se disparará y redirigirá.
    } catch (error) {
        console.error("Error al registrar:", error);
        let errorMessage = 'Error al crear la cuenta.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este correo electrónico ya está registrado.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El formato del correo electrónico es inválido.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'La contraseña es demasiado débil.';
        }
        showAuthMessage(registerMessageDiv, errorMessage, 'error');
    }
});
// Función para iniciar sesión
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        showAuthMessage(loginMessageDiv, '¡Inicio de sesión exitoso! Redirigiendo a tu perfil...', 'success');
        loginForm.reset();
        authModal.style.display = 'none'; // Ocultar el modal después de iniciar sesión
        // Al iniciar sesión con éxito, el onAuthStateChanged se disparará y redirigirá.
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        let errorMessage = 'Error al iniciar sesión.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Correo electrónico o contraseña incorrectos.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El formato del correo electrónico es inválido.';
        }
        showAuthMessage(loginMessageDiv, errorMessage, 'error');
    }
});

// Detectar cambios en el estado de autenticación (cuando un usuario inicia o cierra sesión)
// Este listener redirige si el usuario ya está logueado o se acaba de loguear/registrar.
auth.onAuthStateChanged(user => {
    const miCuentaLink = document.getElementById('openAuthModal');
    
    // Limpiar listeners anteriores para evitar duplicados al reasignar
    if (miCuentaLink._listener) { 
        miCuentaLink.removeEventListener('click', miCuentaLink._listener);
    }

    if (user) {
        // Si hay un usuario logueado, redirige a la página de perfil
        console.log("Usuario detectado en index.html, redirigiendo a profile.html:", user.email);
        window.location.href = 'profile.html';
    } else {
        // No hay usuario logueado, el enlace de la navbar abre el modal
        console.log("Ningún usuario logueado en index.html.");
        miCuentaLink.textContent = 'Mi Cuenta';
        // Asigna el listener para abrir el modal
        miCuentaLink._listener = (e) => {
            e.preventDefault();
            authModal.style.display = 'flex';
        };
        miCuentaLink.addEventListener('click', miCuentaLink._listener);
    }
});