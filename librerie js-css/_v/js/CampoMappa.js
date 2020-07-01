define([
    "dojo/_base/declare", "dojo/_base/lang", "dojo/dom", "dojo/on", "dojo/json","dojo/Deferred",
    "esri/map",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "dojo/_base/Color",
    "esri/toolbars/draw", "esri/graphic", "esri/geometry/Point", "esri/geometry/Polyline", "esri/geometry/Polygon", "esri/geometry/Extent",
    "esri/geometry/webMercatorUtils", "esri/config", "esri/tasks/ProjectParameters", "esri/SpatialReference",
    "esri/tasks/query", "esri/tasks/QueryTask", "esri/tasks/locator", "esri/tasks/GeometryService"
],
function (
    declare, lang, dom, on, JSON, Deferred,
    Map,
    ArcGISTiledMapServiceLayer,
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color,
    Draw, Graphic, Point, Polyline, Polygon, Extent,
    webMercatorUtils, esriConfig, ProjectParameters, SpatialReference,
    Query, QueryTask, Locator, GeometryService
    ) {

    return declare(null, {
        prefisso_map: null,
        map: null,
        savedExtent: null,
        toolbar: null,

        markerSymbol: null,
        lineSymbol: null,
        fillSymbol: null,

        currentGeometry: null,

        constructor: function (prefisso_map, urlSfondo) {
            this.prefisso_map = prefisso_map;

            // Acquisisco initial Extent della geometria salvata
            var initialExtent = null;

            this.map = new Map(prefisso_map + '_' + "mapDiv", {
                logo: false,
                extent: this.savedExtent
            });

            var baseMapLayer = new ArcGISTiledMapServiceLayer(urlSfondo);
            this.map.addLayer(baseMapLayer);
            this.map.on("load", lang.hitch(this, this.initToolbar));

            // Inizializzazione simboli
            this.markerSymbol = new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_DIAMOND, 12,
                new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID,
                        new Color([255, 0, 0]), 2
                    ),
                new Color([255, 255, 0])
                );


            this.lineSymbol = new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 0, 0]), 3
                );


            this.fillSymbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 2),
                        new Color([255, 255, 0, 0.5])
                );
        },

        initToolbar: function () {
            this.map.disableKeyboardNavigation();

            // Inizializzazione toolbar
            this.toolbar = new Draw(this.map);
            this.toolbar.on("draw-end", lang.hitch(this, function (data) { this.addGraphic(data.geometry) }));

            //hook up the button click events
            on(dom.byId(this.prefisso_map + '_' + "drawPoint"), "click", lang.hitch(this, function () {
                this.toolbar.activate(Draw.POINT);
            }));
            on(dom.byId(this.prefisso_map + '_' + "drawPolyline"), "click", lang.hitch(this, function () {
                this.toolbar.activate(Draw.POLYLINE);
            }));
            on(dom.byId(this.prefisso_map + '_' + "drawPolygon"), "click", lang.hitch(this, function () {
                this.toolbar.activate(Draw.POLYGON);
            }));

            this.loadDefaultExtent();
            this.loadSavedGeometry();


            this.map.on("extent-change", lang.hitch(this, function (data) {
                var extent = data.extent;
                validator.tree[(this.prefisso_map + '_' + "serializedExtent").replace(/-/g, '_')].set_value(JSON.stringify(extent));
            }));

            this.map.disableScrollWheelZoom();
        },

        addGraphic: function (geometry) {
            //deactivate the toolbar and clear existing graphics
            if (this.toolbar != null)
                this.toolbar.deactivate();
            this.map.graphics.clear();


            var type = geometry.type, symbol;
            if (type === "point" || type === "multipoint") {
                symbol = this.markerSymbol;
            }
            else if (type === "line" || type === "polyline") {
                symbol = this.lineSymbol;
            }
            else {
                symbol = this.fillSymbol;
            }

            //Add the graphic to the map
            this.map.graphics.add(new Graphic(geometry, symbol));
            this.currentGeometry = geometry;

            validator.tree[(this.prefisso_map + '_' + "serializedExtent").replace(/-/g, '_')].set_value(JSON.stringify(this.map.extent));
            validator.tree[(this.prefisso_map + '_' + "serializedGeometry").replace(/-/g, '_')].set_value(JSON.stringify(geometry));

        },

        loadSavedGeometry: function () {
            var previous_geom = dom.byId(this.prefisso_map + '_serializedGeometry').value;
            var previous_ext = dom.byId(this.prefisso_map + '_serializedExtent').value;

            if (previous_geom != "" && previous_ext != "") {
                var cacheGeom = JSON.parse(previous_geom);
                var cacheExt = JSON.parse(previous_ext);

                // La geometria salvata nel cookie non è una vera geometry, diciamo che è "cachata"
                // Ricostruzione della geometry ESRI
                var geom = null;

                switch (cacheGeom.type) {

                    case "point":
                        var geom = new Point(cacheGeom);
                        var symbol = this.markerSymbol;
                        break;

                    case "polyline":
                        var geom = new Polyline(cacheGeom);
                        var symbol = this.lineSymbol;
                        break;

                    case "polygon":
                        var geom = new Polygon(cacheGeom);
                        var symbol = this.fillSymbol;
                        break;
                }


                this.map.graphics.clear();
                this.map.graphics.add(new Graphic(geom, symbol));
                this.map.setExtent(new Extent(cacheExt));

            }
        },

        loadDefaultExtent: function () {
            var extent_iniziale = readCookie('extent_iniziale');
            if (extent_iniziale != '' && extent_iniziale != null) {
                ext_obj = JSON.parse(decodeURIComponent(extent_iniziale));
                this.map.setExtent(new Extent(ext_obj));
            }
        },

        cancellaGeometry: function () {
            validator.tree[(this.prefisso_map + '_' + "serializedExtent").replace(/-/g, '_')].set_value("");
            validator.tree[(this.prefisso_map + '_' + "serializedGeometry").replace(/-/g, '_')].set_value("");

            this.currentGeometry = null;

            this.map.graphics.clear();
        },

        zoomToFeature: function (selection) {
            //splitto per ottenere le informazioni necessarie dal value della select
            var type_of_feature = selection.split('|')[0],
                    prefix = selection.split('|')[1],
                    where_condition = '',
                    gestisciZoomResults;

            //se si tratta di un dato catastale
            if (type_of_feature == 'Catasto') {
                gestisciZoomResults = lang.hitch(this, this.gestisciCatastoZoomResults);
                comune = $('#' + prefix + '_CatComune').val(),
                        where_condition = "COMUNE = '" + comune + "'";
                //compongo la where condition
                sezione = $('#' + prefix + '_CatSezione').val();
                if (sezione != '') {
                    where_condition = where_condition + " AND SEZIONE = '" + sezione + "'";
                }
                foglio = $('#' + prefix + '_CatFoglio').val();
                if (foglio != '') {
                    where_condition = where_condition + " AND FOGLIO = '" + foglio + "'";
                }
                numero = $('#' + prefix + '_CatNumero').val();
                if (numero != '') {
                    numero_ok = parseInt(numero);
                    if (isNaN(numero_ok)) {
                        numero_ok = numero;
                    } else {
                        numero_ok = numero_ok.toString();
                    }
                    where_condition = where_condition + " AND NUMERO = '" + numero_ok + "'";
                }
                subalterno = $('#' + prefix + '_CatSubalterno').val();
                if (subalterno != '') {
                    where_condition = where_condition + " AND SUBALTERNO = '" + subalterno + "'";
                }
                //altrimenti se si tratta di un dato toponomastico
            } else if (type_of_feature == 'Toponomastica') {
                gestisciZoomResults = lang.hitch(this, this.gestisciToponomasticaZoomResults);
                comune = $('#' + prefix + '_Comune').val(),
                        where_condition = "COMUNE = '" + comune + "'";
                //compongo la where condition
                via = $('#' + prefix + '_Via').val();
                where_condition = where_condition + " AND TOPONIMO = '" + via.replace("'", "\'") + "'";
                civico = $('#' + prefix + '_Civico').val();
                if (civico != '') {
                    where_condition = where_condition + " AND CIVICO = '" + civico + "'";
                }

            }

            codice_modulo = $('meta[name=GLOBO_modulo]').attr('codice_modulo').toUpperCase();

            url_id = $.ajax({
                async: false,
                cache: false,
                url: '/sportello_telematico/get_url_mappa/' + codice_modulo + '/' + this.prefisso_map + '/' + type_of_feature,
                dataType: 'json'
            }).responseText;

            var queryTaskObj = new QueryTask(url_id);
            var queryObj = new Query();

            queryObj.where = where_condition;
            queryObj.outFields = ["*"];
            queryObj.returnGeometry = true;
            queryResults = queryTaskObj.execute(queryObj, gestisciZoomResults), lang.hitch(this, this.gestisciZoomErrors);
        },

        gestisciCatastoZoomResults: function (results) {
            if (results.features.length == 1) {
                this.map.setExtent(results.features[0].geometry.getExtent());
            } else if (results.features.length > 1) {
                total_ext = results.features[0].geometry.getExtent();
                for (var ind in results.features) {
                    total_ext.union(results.features[ind].geometry.getExtent());
                }
                this.map.setExtent(total_ext);
            } else {
                alert('I dati indicati non corrispondono a nessun elemento in mappa. Esegui una validazione e prova nuovamente.');
            }

            //this.map.reposition();
        },

        gestisciToponomasticaZoomResults: function (results) {
            if (results.features.length == 1) {
                single_ext = new Extent(
                        results.features[0].geometry.x - 100,
                        results.features[0].geometry.y - 100,
                        results.features[0].geometry.x + 100,
                        results.features[0].geometry.y + 100,
                        results.features[0].geometry.spatialReference
                        );
                this.map.setExtent(single_ext);
            } else if (results.features.length > 1) {

                x_min = results.features[0].geometry.x;
                y_min = results.features[0].geometry.y;
                x_max = results.features[0].geometry.x;
                y_max = results.features[0].geometry.y;
                spRef = results.features[0].geometry.spatialReference;

                for (var ind in results.features) {
                    if (x_min > results.features[ind].geometry.x)
                        x_min = results.features[ind].geometry.x;
                    if (y_min > results.features[ind].geometry.y)
                        y_min = results.features[ind].geometry.y;
                    if (x_max < results.features[ind].geometry.x)
                        x_max = results.features[ind].geometry.x;
                    if (y_max < results.features[ind].geometry.x)
                        y_max = results.features[ind].geometry.y;
                }
                total_ext = new Extent(x_min, y_min, x_max, y_max, spRef);
                this.map.setExtent(total_ext);
            } else {
                alert('I dati indicati non corrispondono a nessun elemento in mappa. Esegui una validazione e prova nuovamente.');
            }

            //this.map.reposition();
        },

        gestisciZoomErrors: function () {
            alert('I dati indicati non corrispondono a nessun elemento in mappa. Esegui una validazione e prova nuovamente.');
        },

        findByAddress: function (address) {
            var locator = new Locator("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");
            locator.spatialReference = this.map.spatialReference;

            locator.addressToLocations({
                address: { singleLine: address },
                countryCode: "IT",
                forStorage: false,
                maxLocations: 1
            }, lang.hitch(this, function (candidates) {
                if (candidates.length > 0) {
                    var pt = candidates[0].location;
                    this.map.setScale(2000).then(lang.hitch(this, function () {
                        this.map.centerAt(pt)
                    }));

                } else {
                    alert("L'indirizzo specificato non è stato trovato.")
                }
            }), function (err) {
                console.error(err);
            })
        },

        zoomAddressByPrefix: function (prefix) {
            var address = '';
            comune = $('#' + prefix + '_Comune').val(),
            //compongo la where condition
            via = $('#' + prefix + '_Via').val();
            civico = $('#' + prefix + '_Civico').val();
            address = (via + ' ' + civico + ' ' + comune).toUpperCase();
            this.findByAddress(address);
        },

        /// Restituisce le coordinate {x: [number], y: [number] } del punto o del centroide dell'attuale geometria
        getXY: function () {
            var pt = null;
            if (this.currentGeometry != null) {

                switch (this.currentGeometry.type) {
                    case "point":
                        pt = this.currentGeometry;
                        break;
                    case "polyline":
                        pt = this.currentGeometry.getExtent().getCenter();
                        break;
                    case "polygon":
                        pt = this.currentGeometry.getCentroid();
                        break;
                }
            }

            return pt;
        },

        /// Proietta la geometria definita dall'utente in un sistema di riferimento (usare le costanti sotto elencate)
        /// Restituisce le coordinate {x: [number], y: [number] } del punto o del centroide nel nuovo sistema di riferimento
        WGS_1984: 4326,
        UTM32_WGS84: 32632,
        UTM33_WGS84: 32633,
        WEBMERCATOR: 102100,
        project: function (targetWKID) {
            var deferred = new Deferred();

            // Acquisizione geometria di input
            var pt = this.getXY();
            if (pt != null) {

                // Creazione spatial reference di output
                var targetSR = new SpatialReference(targetWKID);

                // Esecuzione della proiezione asincrona
                var params = new ProjectParameters();
                params.geometries = [pt];
                params.outSR = targetSR;
                var geomService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
                geomService.project(params).then(
                    function (geoms) {
                        deferred.resolve(geoms[0]);
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                );
            } else {
                window.setTimeout(function () { deferred.reject(new Error("Non è stata disegnata alcuna geometria in mappa")), 100 })
            }

            // Resituzione della promise
            return deferred.promise;
        }
    })
})


