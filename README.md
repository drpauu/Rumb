# Rumb Comarcal

## Requisits
- Node.js 18+.
- Fitxer GeoJSON d'entrada a `data/comarques_icgc.geojson` (42 comarques).

## Com posar en marxa
1) Instal.la dependencies:
```
npm install
```

2) Genera el TopoJSON optimitzat:
```
npm run build:map
```

3) Arrenca el servidor de desenvolupament:
```
npm run dev
```

## Nivells diaris i setmanals
El generador usa la clau de servei de Supabase per inserir nivells a la base de dades.

### Execucio manual
```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run level:daily
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run level:weekly
```

### Programacio amb cron (exemple)
```
1 0 * * * cd /Users/pau/Desktop/GitHub/Rumb/Rumb && SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run level:daily
1 0 * * 1 cd /Users/pau/Desktop/GitHub/Rumb/Rumb && SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run level:weekly
```

## Notes
- Si el camp del nom no es detecta, pots indicar-lo amb:
```
NAME_FIELD=nom_comar npm run build:map
```
- Si no hi ha `data/comarques_icgc.geojson`, el script combina els GeoJSON de `comarques_repo_git`.
- Les comarques duplicades es fusionen per nom per evitar forats al mapa.
- El fitxer de sortida es crea a `public/catalunya-comarques.topojson`.
