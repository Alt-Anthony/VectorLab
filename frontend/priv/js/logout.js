async function cerrarSesion() {
    try {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            window.location.href = '../../pub/pages/login.html';
        } else {
            const data = await res.json();
            alert(data.message || 'Error al cerrar sesión');
        }
    } catch (error) {
        console.error('Error en logout:', error);
    }
}