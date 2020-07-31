
function stopUpload(success, message, caller) {
    $('#' + caller + '_upload_process').css('display', 'none');
    upload_caller = '';
    if (success == 1) {
        //$('#' + caller + '_result').html('<span class="msg">The file was uploaded in ' + message + '<\/span><br/><br/>');
        $('#' + caller + '_result').css('display', 'none');
        $('#' + caller + '_destImmagine').prop('src', message);
        //$('#' + caller + '_valueField').val(message);
        validator.tree[caller + '_valueField'].set_value(message);
        $('#' + caller + '_formato').css('display', 'none');
        $('#' + caller + '_dimensione').css('display', 'none');
        return true;
    } else {
        validator.tree[caller + '_valueField'].set_value('');
        $('#' + caller + '_result').css('display', 'block');
        $('#' + caller + '_result').html('<span class="msg">Errore durante il caricamento dell\'immagine: ' + message + '<\/span><br/><br/>');
    }
}

function startUpload(prefix) {
    upload_caller = prefix;
    $('#' + prefix + '_upload_process').css('display', 'block');
}

function cancellaUpload(prefix) {
    validator.tree[prefix + '_valueField'].set_value('');
    //$('#' + prefix + '_valueField').val('');
    $('#' + prefix + '_destImmagine').prop('src', './appoggio/img/white.png');
    $('#' + prefix + '_formato').css('display', 'block');
    $('#' + prefix + '_dimensione').css('display', 'block');
}

function loadImmagini() {
    $('meta[name=GLOBO_immagine]').each(function(indice) {
        prefisso_img = $(this).attr('prefisso');
        if ($('input#' + prefisso_img + '_valueField').val() != '') {
            stopUpload(1, $('input#' + prefisso_img + '_valueField').val(), prefisso_img);
        }
        //$('img[id=' + prefisso + '_destImmagine]').prop('src', $('input[id=' + prefisso + '_valueField]').val());
    }
    );
    upload_caller = '';
}