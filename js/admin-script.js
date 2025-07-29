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

// Referencias a los servicios de Firebase
const database = firebase.database();
const auth = firebase.auth();
const bookingsRef = database.ref('reservas');
const usersRef = database.ref('usuarios'); // Referencia al nodo de usuarios

// --- Elementos del DOM ---
const loginSection = document.getElementById('loginSection');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const loginButton = document.getElementById('loginButton');
const loginMessageDiv = document.getElementById('loginMessage');

const adminPanel = document.getElementById('adminPanel');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userNavEmail = document.getElementById('userNavEmail');
const logoutButton = document.getElementById('logoutButton'); // Botón en el dashboard
const logoutButtonNav = document.getElementById('logoutButtonNav'); // Botón en la navbar
const userNavSection = document.getElementById('userNavSection'); // Sección de usuario en la navbar
const bookingsList = document.getElementById('bookingsList');
const noBookingsMessage = document.getElementById('noBookingsMessage');

// Elementos de estadísticas
const pendingCount = document.getElementById('pendingCount');
const confirmedCount = document.getElementById('confirmedCount');
const todayCount = document.getElementById('todayCount');
const revenueCount = document.getElementById('revenueCount');

// Elementos de filtrado
const filterStatus = document.getElementById('filterStatus');
const filterDate = document.getElementById('filterDate');

// --- Elementos del DOM para ADEUDOS --- 
const debtsTableBody = document.querySelector('#debtsTable tbody');
const adminMessageDiv = document.getElementById('adminMessage'); // Div de mensajes general del admin panel


// --- Funciones de utilidad ---
function showMessage(element, msg, type) {
    element.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
    element.className = `message ${type}`;
    element.style.display = 'flex';
    element.style.alignItems = 'center';
    element.style.gap = '10px';
    
    setTimeout(() => {
        element.style.display = 'none';
        element.innerHTML = '';
        element.className = 'message';
    }, 5000);
}

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('es-ES', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

// --- Manejo de autenticación ---
loginButton.addEventListener('click', async () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;

    if (!email || !password) {
        showMessage(loginMessageDiv, 'Por favor, ingresa tu correo y contraseña.', 'error');
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // --- VERIFICACIÓN DE ROL DE ADMINISTRADOR ---
        const adminDataSnapshot = await usersRef.child(user.uid).child('isAdmin').once('value');
        const isAdmin = adminDataSnapshot.val() === true; // Asegúrate de que sea booleano true

        if (isAdmin) {
            showMessage(loginMessageDiv, 'Inicio de sesión exitoso como administrador.', 'success');
            loginSection.style.display = 'none'; // Ocultar sección de login
            adminPanel.style.display = 'block';   // Mostrar panel de administración
            userEmailDisplay.textContent = user.email; // Mostrar el email del admin en el dashboard
            userNavEmail.textContent = user.email; // Mostrar el email del admin en la navbar
            userNavSection.style.display = 'flex'; // Mostrar la sección de usuario en la navbar
            
            // Cargar datos del panel de admin (citas y adeudos)
            loadBookings();
            loadUsersAndDebts(); 

        } else {
            // Si no es admin, cierra la sesión y muestra un error
            await auth.signOut(); // Cierra la sesión si no es admin
            showMessage(loginMessageDiv, 'Acceso denegado: No tienes permisos de administrador.', 'error');
            adminEmailInput.value = '';
            adminPasswordInput.value = '';
        }
    } catch (error) {
        console.error("Error en el login del administrador:", error);
        let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Correo o contraseña incorrectos.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Formato de correo electrónico inválido.';
        }
        showMessage(loginMessageDiv, errorMessage, 'error');
    }
});

// Manejadores para los botones de cerrar sesión (dashboard y navbar)
[logoutButton, logoutButtonNav].forEach(btn => { 
    btn.addEventListener('click', async () => { 
        try { 
            await auth.signOut(); 
            // La redirección y el mensaje se manejarán en auth.onAuthStateChanged
        } catch (error) { 
            console.error("Error al cerrar sesión:", error); 
        }
    });
});

// --- Escuchar cambios de autenticación y verificar rol ---
auth.onAuthStateChanged(async user => { 
    if (user) { 
        // Usuario autenticado, verificar si es admin
        try { 
            const adminDataSnapshot = await usersRef.child(user.uid).child('isAdmin').once('value');
            const isAdmin = adminDataSnapshot.val() === true;

            if (isAdmin) { 
                loginSection.style.display = 'none'; 
                adminPanel.style.display = 'block'; 
                userNavSection.style.display = 'flex'; 
                userEmailDisplay.textContent = user.email; 
                userNavEmail.textContent = user.email; 

                // Cargar datos si no están ya cargados (evita recargar en cada cambio de estado si ya está visible) 
                // Asegurarse de que debtsTableBody y bookingsList existen antes de intentar usarlos.
                if (bookingsList && bookingsList.innerHTML.includes('Cargando citas...') || 
                    (debtsTableBody && debtsTableBody.innerHTML.includes('Cargando clientes...'))) { 
                   loadBookings(); 
                   loadUsersAndDebts(); 
                }
            } else {
                // No es admin, cierra sesión y redirige al login 
                await auth.signOut(); 
                // El bloque 'else' de auth.onAuthStateChanged manejará la redirección y mensaje
            }
        } catch (error) {
            console.error("Error verificando rol de admin:", error); 
            await auth.signOut(); // En caso de error, también cierra sesión 
        }
    } else {
        // Usuario no autenticado, mostrar solo la sección de login 
        loginSection.style.display = 'flex'; 
        adminPanel.style.display = 'none'; 
        userNavSection.style.display = 'none'; 
        adminEmailInput.value = ''; 
        adminPasswordInput.value = ''; 
        userEmailDisplay.textContent = ''; 
        userNavEmail.textContent = ''; 
        showMessage(loginMessageDiv, 'Has cerrado sesión o tu sesión ha expirado.', 'info'); 
    }
});

// --- Cargar y mostrar citas ---
function loadBookings() {
    bookingsList.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando citas...</p>
        </div>
    `; 
    noBookingsMessage.style.display = 'none'; 

    bookingsRef.on('value', (snapshot) => { 
        const bookings = snapshot.val(); 
        bookingsList.innerHTML = ''; 
        
        if (bookings) { 
            let bookingsArray = Object.entries(bookings).map(([key, value]) => ({ id: key, ...value })); 
            
            // Aplicar filtros
            const statusFilter = filterStatus.value; 
            const dateFilter = filterDate.value; 
            
            if (statusFilter !== 'all') { 
                bookingsArray = bookingsArray.filter(booking => booking.estado === statusFilter); 
            }
            
            if (dateFilter) { 
                bookingsArray = bookingsArray.filter(booking => booking.fechaCita === dateFilter); 
            }
            
            // Actualizar estadísticas
            updateStats(bookingsArray); 
            
            if (bookingsArray.length === 0) { 
                noBookingsMessage.style.display = 'flex'; 
                return; 
            }
            
            // Ordenar por fecha más reciente
            bookingsArray.sort((a, b) => new Date(a.fechaCita) - new Date(b.fechaCita)); 
            
            // Crear tabla
            const table = document.createElement('table'); 
            table.className = 'bookings-table'; 
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Servicio</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `; 
            
            const tbody = table.querySelector('tbody'); 
            
            bookingsArray.forEach(booking => { 
                const row = tbody.insertRow(); 
                row.className = `booking-row status-${booking.estado}`; 
                row.innerHTML = `
                    <td>${booking.nombreCliente}</td>
                    <td>${formatDate(booking.fechaCita)}</td>
                    <td>${booking.horaCita}</td>
                    <td>${booking.servicioSolicitado}</td>
                    <td>${formatCurrency(booking.precioServicio)}</td>
                    <td>
                        <select data-id="${booking.id}" class="status-select ${booking.estado}">
                            <option value="pendiente" ${booking.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="confirmada" ${booking.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                            <option value="completada" ${booking.estado === 'completada' ? 'selected' : ''}>Completada</option>
                            <option value="cancelada" ${booking.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn delete-btn" data-id="${booking.id}" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `; 
            });
            
            bookingsList.appendChild(table); 
            noBookingsMessage.style.display = 'none'; 
            
            // Añadir event listeners
            document.querySelectorAll('.status-select').forEach(select => { 
                select.addEventListener('change', (e) => updateBookingStatus(e.target.dataset.id, e.target.value)); 
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => { 
                btn.addEventListener('click', (e) => deleteBooking(e.target.closest('button').dataset.id)); 
            });
            
        } else { 
            noBookingsMessage.style.display = 'flex'; 
            updateStats([]); 
        }
    }); 
}

// --- Actualizar estadísticas ---
function updateStats(bookings) {
    const today = new Date().toISOString().split('T')[0]; 
    
    const pending = bookings.filter(b => b.estado === 'pendiente').length; 
    const confirmed = bookings.filter(b => b.estado === 'confirmada').length; 
    const todayBookings = bookings.filter(b => b.fechaCita === today).length; 
    const revenue = bookings.reduce((sum, b) => sum + (b.precioServicio || 0), 0); 
    
    pendingCount.textContent = pending; 
    confirmedCount.textContent = confirmed; 
    todayCount.textContent = todayBookings; 
    revenueCount.textContent = formatCurrency(revenue); 
}

// --- Actualizar estado de una cita ---
async function updateBookingStatus(id, newStatus) {
    try { 
        await bookingsRef.child(id).update({ estado: newStatus }); 
        showMessage(loginMessageDiv, 'Estado de la cita actualizado.', 'success'); 
    } catch (error) { 
        showMessage(loginMessageDiv, 'Error al actualizar el estado.', 'error'); 
    }
}

// --- Eliminar una cita ---
async function deleteBooking(id) {
    if (confirm('¿Estás seguro de eliminar esta cita? Esta acción no se puede deshacer.')) { 
        try { 
            await bookingsRef.child(id).remove(); 
            showMessage(loginMessageDiv, 'Cita eliminada correctamente.', 'success'); 
        } catch (error) { 
            showMessage(loginMessageDiv, 'Error al eliminar la cita.', 'error'); 
        }
    }
}

// --- Filtros ---
[filterStatus, filterDate].forEach(filter => { 
    filter.addEventListener('change', () => { 
        loadBookings(); 
    });
});

// Inicializar fecha del filtro con hoy
filterDate.value = new Date().toISOString().split('T')[0]; 


// --- Gestión de Adeudos de Clientes ---
function loadUsersAndDebts() {
    // Asegúrate de que debtsTableBody no esté null antes de usarlo
    if (!debtsTableBody) { 
        console.error("Elemento debtsTableBody no encontrado. Asegúrate de que '#debtsTable tbody' exista en admin.html."); 
        return; 
    }

    debtsTableBody.innerHTML = '<tr><td colspan="4">Cargando clientes...</td></tr>'; // Mensaje de carga 

    usersRef.on('value', (snapshot) => { 
        debtsTableBody.innerHTML = ''; 
        let hasUsers = false; 
        const currentUserUid = auth.currentUser ? auth.currentUser.uid : null; 

        snapshot.forEach((childSnapshot) => { 
            const userId = childSnapshot.key; 
            const userData = childSnapshot.val(); 

            // Opcional: No mostrar al propio administrador en la lista de adeudos
            // if (userId === currentUserUid && userData.isAdmin) {
            //     return; // Saltar al propio admin
            // }

            hasUsers = true; 
            const row = debtsTableBody.insertRow(); 
            row.dataset.userId = userId; 

            row.innerHTML = `
                <td>${userData.nombre || 'N/A'}</td>
                <td>${userData.email || 'N/A'}</td>
                <td>
                    <input type="number" step="0.01" value="${(userData.adeudoTotal || 0).toFixed(2)}" 
                        class="adeudo-input" data-userid="${userId}">
                </td>
                <td>
                    <button class="action-btn update-adeudo-btn" data-userid="${userId}">Actualizar</button>
                </td>
            `; 
        });

        if (!hasUsers) { 
            debtsTableBody.innerHTML = '<tr><td colspan="4">No hay clientes registrados con adeudos.</td></tr>'; 
        }

        // Añadir event listeners a los botones de actualización
        document.querySelectorAll('.update-adeudo-btn').forEach(button => { 
            // Limpiar listeners para evitar duplicados si la tabla se recarga
            if (button._updateListener) { 
                button.removeEventListener('click', button._updateListener); 
            }
            const listener = async (e) => { 
                const userId = e.target.dataset.userid; 
                const adeudoInput = document.querySelector(`.adeudo-input[data-userid="${userId}"]`); 
                const newAdeudo = parseFloat(adeudoInput.value); 

                if (!isNaN(newAdeudo) && newAdeudo >= 0) { 
                    await updateUserAdeudo(userId, newAdeudo); 
                } else {
                    showMessage(adminMessageDiv, 'Por favor, ingresa un número válido para el adeudo.', 'error'); 
                }
            };
            button.addEventListener('click', listener); 
            button._updateListener = listener; // Guarda el listener para removerlo después 
        });

    }, (error) => { 
        console.error("Error al cargar usuarios y adeudos:", error); 
        debtsTableBody.innerHTML = '<tr><td colspan="4">Error al cargar datos.</td></tr>'; 
        showMessage(adminMessageDiv, 'Error al cargar la lista de clientes.', 'error'); 
    });
}

async function updateUserAdeudo(userId, newAdeudo) {
    try { 
        await usersRef.child(userId).update({ adeudoTotal: newAdeudo }); 
        showMessage(adminMessageDiv, `Adeudo de cliente ${userId} actualizado a $${newAdeudo.toFixed(2)}`, 'success'); 
    } catch (error) { 
        console.error("Error al actualizar adeudo:", error); 
        let errorMessage = 'Hubo un error al actualizar el adeudo.'; 
        if (error.code === 'PERMISSION_DENIED') { 
            errorMessage = 'Permiso denegado. Asegúrate de tener rol de administrador.'; 
        }
        showMessage(adminMessageDiv, errorMessage, 'error'); 
    }
}