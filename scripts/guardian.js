const fs = require('fs');

const FIRMAS_CAIDO = {
  'filemoon':    [/file not found/i, /no longer available/i, /video not found/i],
  'streamtape':  [/video not found/i, /has been deleted/i],
  'doodstream':  [/file not found/i],
  'voe':         [/video not found/i],
  'mixdrop':     [/file does not exist/i]
};

async function verificarEnlace(url) {
    try {
        const res = await fetch(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000 
        });
        
        if (res.status === 404 || res.status === 410) return 'caido';
        
        const html = await res.text();
        const host = new URL(url).hostname;
        let firmasDelHost = [];
        
        for (const [key, firmas] of Object.entries(FIRMAS_CAIDO)) {
            if (host.includes(key)) { firmasDelHost = firmas; break; }
        }

        for (const firma of firmasDelHost) {
            if (firma.test(html)) return 'caido';
        }

        return 'activo';
    } catch (e) {
        return 'error';
    }
}

async function main() {
    if (!fs.existsSync('urls.json')) {
        console.log("No hay urls.json para verificar.");
        return;
    }
    
    const db = JSON.parse(fs.readFileSync('urls.json', 'utf8'));
    const reporte = { fecha: new Date().toISOString(), pastes: [] };
    let avisos = [];

    for (const paste of db.pastes) {
        let activos = 0;
        let detalles = [];

        for (const url of paste.enlaces) {
            const estado = await verificarEnlace(url);
            detalles.push({ url, estado });
            if (estado === 'activo') activos++;
            await new Promise(r => setTimeout(r, 800));
        }

        const estadoGlobal = activos === 0 ? 'critico' : (activos <= 2 ? 'advertencia' : 'ok');
        
        reporte.pastes.push({
            id: paste.id,
            activos,
            total: paste.enlaces.length,
            estado: estadoGlobal,
            detalles
        });

        if (estadoGlobal !== 'ok') {
            avisos.push(`- Paste ${paste.id}: ${activos}/${paste.enlaces.length} activos.`);
        }
    }

    fs.writeFileSync('estado_enlaces.json', JSON.stringify(reporte, null, 2));
    console.log(`Verificación completa. Pastes con problemas: ${avisos.length}`);
}

main();
