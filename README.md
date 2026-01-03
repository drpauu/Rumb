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

## Notes
- Si el camp del nom no es detecta, pots indicar-lo amb:
```
NAME_FIELD=nom_comar npm run build:map
```
- Si no hi ha `data/comarques_icgc.geojson`, el script combina els GeoJSON de `comarques_repo_git`.
- Les comarques duplicades es fusionen per nom per evitar forats al mapa.
- El fitxer de sortida es crea a `public/catalunya-comarques.topojson`.
