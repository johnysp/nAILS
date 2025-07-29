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

// Inicializa Firebase Auth
const auth = firebase.auth();

// --- Elementos del DOM para Perfil del Cliente ---
const userProfileSection = document.getElementById('userProfile');
const profileWelcomeText = document.getElementById('profileWelcomeText');
const profileNameSpan = document.getElementById('profileName');
const profileEmailSpan = document.getElementById('profileEmail');
const profileAdeudoSpan = document.getElementById('profileAdeudo'); 
const logoutBtnProfile = document.getElementById('logoutBtn'); 
const userBookingsList = document.getElementById('userBookingsList');
const profileNavLink = document.getElementById('profileNavLink'); 

// Función para mostrar mensajes (simple, podrías adaptarla si quieres mensajes en el perfil)
function showProfileMessage(msg, type = 'success') {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = msg;
    msgDiv.className = `message ${type}`;
    msgDiv.style.marginTop = '20px';
    msgDiv.style.padding = '15px';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.textAlign = 'center';

    if (type === 'success') {
        msgDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
        msgDiv.style.color = '#28a745';
    } else if (type === 'error') {
        msgDiv.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        msgDiv.style.color = '#dc3545';
    }
    userProfileSection.prepend(msgDiv); // Añade el mensaje al principio de la sección de perfil

    setTimeout(() => {
        msgDiv.remove();
    }, 5000);
}


// Detectar cambios en el estado de autenticación
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Usuario ha iniciado sesión
        console.log("Usuario en profile.html:", user.email);

        // Asegurarse de que el enlace de navegación "Mi Perfil" esté activo
        if (profileNavLink) {
            profileNavLink.classList.add('active');
        }

        // Cargar información del usuario del Realtime Database
        const userRef = database.ref('usuarios/' + user.uid);
        userRef.on('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData && userData.nombre) { 
                profileWelcomeText.textContent = `Bienvenido, ${userData.nombre}!`;
                profileNameSpan.textContent = userData.nombre;
            } else {
                profileWelcomeText.textContent = `Bienvenido, usuario!`; 
                profileNameSpan.textContent = 'Nombre no disponible';
                if (userData === null || !userData.nombre) {
                    showProfileMessage('Tus datos de perfil están incompletos. Si eres nuevo, registra tu nombre en tu primera reserva.', 'error');
                }
            }
            profileEmailSpan.textContent = user.email;

            // Mostrar el adeudo
            if (userData && typeof userData.adeudoTotal === 'number') {
                profileAdeudoSpan.textContent = `$${userData.adeudoTotal.toFixed(2)}`; 
            } else {
                profileAdeudoSpan.textContent = `$0.00`; 
            }

        }, (error) => {
            console.error("Error al cargar datos del usuario:", error);
            profileNameSpan.textContent = 'Error al cargar nombre';
            profileEmailSpan.textContent = user.email; 
            showProfileMessage('Hubo un error al cargar tu información de perfil.', 'error');
        });


        // Cargar y mostrar las citas del usuario
        const userBookingsRef = database.ref('reservas').orderByChild('userId').equalTo(user.uid);
        userBookingsRef.on('value', (snapshot) => {
            userBookingsList.innerHTML = ''; 
            const bookings = [];
            snapshot.forEach((childSnapshot) => {
                const booking = childSnapshot.val();
                booking.id = childSnapshot.key; 
                bookings.push(booking);
            });

            if (bookings.length === 0) {
                userBookingsList.innerHTML = '<p class="no-bookings">No tienes citas agendadas aún.</p>';
            } else {
                bookings.sort((a, b) => {
                    const dateA = new Date(`${a.fechaCita}T${a.horaCita}`);
                    const dateB = new Date(`${b.fechaCita}T${b.horaCita}`);
                    return dateA - dateB;
                });

                bookings.forEach(booking => {
                    const bookingItem = document.createElement('div');
                    bookingItem.classList.add('booking-item');
                    bookingItem.innerHTML = `
                        <p><strong><i class="fas fa-hand-sparkles"></i> Servicio:</strong> ${booking.servicioSolicitado}</p>
                        <p><strong><i class="fas fa-calendar-day"></i> Fecha:</strong> ${booking.fechaCita}</p>
                        <p><strong><i class="fas fa-clock"></i> Hora:</strong> ${booking.horaCita}</p>
                        <p><strong><i class="fas fa-dollar-sign"></i> Precio:</strong> $${booking.precioServicio}</p>
                        <span class="status ${booking.estado}">${booking.estado}</span>
                    `;
                    userBookingsList.appendChild(bookingItem);
                });
            }
        }, (error) => {
            console.error("Error al cargar las citas del usuario:", error);
            userBookingsList.innerHTML = '<p class="no-bookings error">Error al cargar tus citas.</p>';
            showProfileMessage('Hubo un error al cargar tus citas.', 'error');
        });


        // Manejar el botón "Cerrar Sesión" en la sección de perfil
        if (!logoutBtnProfile._listenerAdded) {
            logoutBtnProfile.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    showProfileMessage('Has cerrado sesión exitosamente.', 'success');
                } catch (error) {
                    console.error("Error al cerrar sesión desde el perfil:", error);
                    showProfileMessage('Error al cerrar sesión. Inténtalo de nuevo.', 'error');
                }
            });
            logoutBtnProfile._listenerAdded = true; 
        }


    } else {
        // No hay usuario logueado, redirigir a la página de inicio (index.html)
        console.log("Ningún usuario logueado en profile.html. Redirigiendo a index.html");
        window.location.href = 'index.html'; // Redirige al usuario
    }
});