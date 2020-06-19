function init() {

    // Acquisisco initial Extent della geometria salvata
    var initialExtent = null;

    // Inizializzazione mappa
    app.map = new esri.Map(prefisso_map + '_' + "mapDiv", {
        logo: false,
        extent: app.savedExtent
    });

    var baseMapLayer = new esri.layers.ArcGISTiledMapServiceLayer(app.url);
    app.map.addLayer(baseMapLayer);
    dojo.connect(app.map, "onLoad", initToolbar);

    // Inizializzazione simboli
    app.markerSymbol = new esri.symbol.SimpleMarkerSymbol(
            esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND, 12,
            new esri.symbol.SimpleLineSymbol(
                    esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color("red"), 2
                    ),
            new dojo.Color("yellow")
            );


    app.lineSymbol = new esri.symbol.SimpleLineSymbol(
            esri.symbol.SimpleLineSymbol.STYLE_SOLID,
            new dojo.Color("red"), 3
            );


    app.fillSymbol = new esri.symbol.SimpleFillSymbol(
            esri.symbol.SimpleFillSymbol.STYLE_SOLID,
            new esri.symbol.SimpleLineSymbol(
                    esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                    new dojo.Color("red"), 2
                    ),
            (function () {
                var x = new dojo.Color("yellow");
                x.a = 0.5; // Opacity fissa a 0.5
                return x;
            })()
            );
}

function initToolbar() {
    app.map.disableKeyboardNavigation();

    // Inizializzazione toolbar
    app.toolbar = new esri.toolbars.Draw(app.map);
    dojo.connect(app.toolbar, "onDrawEnd", addGraphic);

    //hook up the button click events
    dojo.connect(dojo.byId(prefisso_map + '_' + "drawPoint"), "click", function () {
        app.toolbar.activate(esri.toolbars.Draw.POINT);
    });
    dojo.connect(dojo.byId(prefisso_map + '_' + "drawPolyline"), "click", function () {
        app.toolbar.activate(esri.toolbars.Draw.POLYLINE);
    });
    dojo.connect(dojo.byId(prefisso_map + '_' + "drawPolygon"), "click", function () {
        app.toolbar.activate(esri.toolbars.Draw.POLYGON);
    });

    // Disegno la geometria salvata se presente
    if (app.savedGeometry != null)
        addGraphic(app.savedGeometry);

    loadDefaultExtent();
    loadSavedGeometry();


    dojo.connect(app.map, "onExtentChange", function (extent) {
        validator.tree[(prefisso_map + '_' + "serializedExtent").replace(/-/g, '_')].set_value(dojo.toJson(extent));
    });

    app.map.disableScrollWheelZoom();

}

function addGraphic(geometry) {
    //deactivate the toolbar and clear existing graphics
    if (app.toolbar != null)
        app.toolbar.deactivate();
    app.map.graphics.clear();


    var type = geometry.type, symbol;
    if (type === "point" || type === "multipoint") {
        symbol = app.markerSymbol;
    }
    else if (type === "line" || type === "polyline") {
        symbol = app.lineSymbol;
    }
    else {
        symbol = app.fillSymbol;
    }

    //Add the graphic to the map
    app.map.graphics.add(new esri.Graphic(geometry, symbol));
    /*
     dojo.byId(prefisso + '_' + "serializedGeometry").value = dojo.toJson(geometry);
     dojo.byId(prefisso + '_' + "serializedExtent").value = dojo.toJson(app.map.extent);
     */
    prefisso_map = $('meta[name=GLOBO_mappa]').first().attr('prefisso');
    validator.tree[(prefisso_map + '_' + "serializedExtent").replace(/-/g, '_')].set_value(dojo.toJson(app.map.extent));
    validator.tree[(prefisso_map + '_' + "serializedGeometry").replace(/-/g, '_')].set_value(dojo.toJson(geometry));

    //document.cookie = dojo.toJson(geometry) + "|" + dojo.toJson(app.map.extent);
}

function loadSavedGeometry() {

    prefisso_map = $('meta[name=GLOBO_mappa]').first().attr('prefisso');
    if (esri.geometry && app.map.graphics) {
        var previous_geom = document.getElementById(prefisso_map + '_serializedGeometry').value;
        var previous_ext = document.getElementById(prefisso_map + '_serializedExtent').value;

        if (previous_geom != "" && previous_ext != "") {
            var cacheGeom = dojo.fromJson(previous_geom);
            var cacheExt = dojo.fromJson(previous_ext);

            // La geometria salvata nel cookie non � una vera esri.geometry, diciamo che � "cachata"
            // Ricostruzione della geometry ESRI
            var geom = null;

            switch (cacheGeom.type) {

                case "point":
                    var geom = new esri.geometry.Point(cacheGeom);
                    var symbol = app.markerSymbol;
                    break;

                case "polyline":
                    var geom = new esri.geometry.Polyline(cacheGeom);
                    var symbol = app.lineSymbol;
                    break;

                case "polygon":
                    var geom = new esri.geometry.Polygon(cacheGeom);
                    var symbol = app.fillSymbol;
                    break;
            }


            app.map.graphics.clear();
            app.map.graphics.add(new esri.Graphic(geom, symbol));
            app.map.setExtent(new esri.geometry.Extent(cacheExt));
            //app.savedGeometry= geom;

            //app.savedExtent = new esri.geometry.Extent(cacheExt);

        }
    }
}


function loadDefaultExtent() {
    var extent_iniziale = readCookie('extent_iniziale');
    if (extent_iniziale != '' && extent_iniziale != null) {
        ext_obj = dojo.fromJson(decodeURIComponent(extent_iniziale));
        app.map.setExtent(new esri.geometry.Extent(ext_obj));
    }
}



function cancellaGeometry(prefisso_map) {

    prefisso_map = $('meta[name=GLOBO_mappa]').first().attr('prefisso');
    validator.tree[(prefisso_map + '_' + "serializedExtent").replace(/-/g, '_')].set_value("");
    validator.tree[(prefisso_map + '_' + "serializedGeometry").replace(/-/g, '_')].set_value("");

    app.map.graphics.clear();
}


function zoomToFeature(prefisso_map, selection) {
    //splitto per ottenere le informazioni necessarie dal value della select
    var type_of_feature = selection.split('|')[0],
            prefix = selection.split('|')[1],
            where_condition = '',
            gestisciZoomResults;

    //se si tratta di un dato catastale
    if (type_of_feature == 'Catasto') {
        gestisciZoomResults = gestisciCatastoZoomResults;
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
        gestisciZoomResults = gestisciToponomasticaZoomResults;
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
        url: '/sportello_telematico/get_url_mappa/' + codice_modulo + '/' + prefisso_map + '/' + type_of_feature,
        dataType: 'json'
    }).responseText;

    require(["esri/tasks/query", "esri/tasks/QueryTask"], function (Query, QueryTask) {
        app.queryTaskObj = new QueryTask(url_id);
        app.queryObj = new Query();

        app.queryObj.where = where_condition;
        app.queryObj.outFields = ["*"];
        app.queryObj.returnGeometry = true;


        queryResults = app.queryTaskObj.execute(app.queryObj, gestisciZoomResults, gestisciZoomErrors);

        //promises = new all([queryResults]);
        //promises.then(gestisciZoomResults);
    }
    );


}

function gestisciCatastoZoomResults(results) {
    if (results.features.length == 1) {
        app.map.setExtent(results.features[0].geometry.getExtent());
    } else if (results.features.length > 1) {
        total_ext = results.features[0].geometry.getExtent();
        for (var ind in results.features) {
            total_ext.union(results.features[ind].geometry.getExtent());
        }
        app.map.setExtent(total_ext);
    } else {
        alert('I dati indicati non corrispondono a nessun elemento in mappa. Esegui una validazione e prova nuovamente.');
    }

    app.map.reposition();
}

function gestisciToponomasticaZoomResults(results) {
    if (results.features.length == 1) {
        single_ext = new esri.geometry.Extent(
                results.features[0].geometry.x - 100,
                results.features[0].geometry.y - 100,
                results.features[0].geometry.x + 100,
                results.features[0].geometry.y + 100,
                results.features[0].geometry.spatialReference
                );
        app.map.setExtent(single_ext);
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
        total_ext = new esri.geometry.Extent(x_min, y_min, x_max, y_max, spRef);
        app.map.setExtent(total_ext);
    } else {
        alert('I dati indicati non corrispondono a nessun elemento in mappa. Esegui una validazione e prova nuovamente.');
    }

    app.map.reposition();
}

function gestisciZoomErrors() {
    alert('I dati indicati non corrispondono a nessun elemento in mappa. Esegui una validazione e prova nuovamente.');
}