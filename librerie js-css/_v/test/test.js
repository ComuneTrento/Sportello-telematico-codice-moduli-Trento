module('Building Rules');
test('Initialize validator', function() {
    //Check tipo di nodo
    ok(typeof validator !== 'undefined', 'validator exists');
    ok(typeof validator.tree !== 'undefined', 'validator tree build');
    ok(typeof rules !== 'undefined', 'rules build');

    var node, e;
    for (node in validator.tree) {
        e = validator.tree[node];
        notEqual(e, undefined, 'il nodo deve esistere');
        notEqual(e, null, 'il nodo deve esistere');

        ok(e instanceof Node, 'Il nodo deve appartenere alla classe Node');
    }

    //Check regole
    notEqual(rules, undefined, 'Rules esiste');
    var rule;
    for (rule in rules) {
        e = rules[rule];

        notEqual(e, undefined, 'La regola deve essere definita');
        notEqual(e, null, 'La regola deve esistere');

        ok(e instanceof Rule, 'La regola deve essere un instanza di Rule');
        ok(e._registered_node.length > 0, 'La regola deve avere qualcuno che la usa');
    }
});

test("Parsing DOM", function() {
    //Test mandatory enabled
    ok(true, 'test');
    //equal( element.getAttribute('mandatory'), '#checkbox1.checked()', 'split mandatory_enabled 1/2' );
    //equal( element.getAttribute('enabled'), '#checkbox1.checked()', 'split mandatory_enabled 2/2' );
    var el = $('#textbox1').get(0);

    equal(validator.tree[el.id], $(el).data('rule'), 'Nodo uguale assegnato allo stesso ID');
    var node = validator.tree[el.id];
    //equal( node.enabled, undefined,  )


});

test('Event bindings', function() {
    ok(true, 'test');
});

test('Radio group Node', function() {
    var group = validator.tree['test_group'];
    var elements = $('[name=test_group]').get();
    deepEqual(group.element, elements, 'il radio group ha tutte le regole del caso');
});

module('Rules function');
test("Radio", function() {
    var checkbox1 = document.getElementById('checkbox1'),
        radio1 = document.getElementById('text_group1'),
        radio1_node = validator.tree['text_group1'],
        textbox1 = document.getElementById('textbox1'),
        textbox2 = document.getElementById('textbox2'),
        textbox1_node = validator.tree['textbox1'],
        textbox2_node = validator.tree['textbox2'],
        radio2 = document.getElementById('text_group2');
    radio2_node = validator.tree['text_group2'],
    textbox5_node = validator.tree['textbox5'],
    textbox6_node = validator.tree['textbox6'],
    group = validator.tree['test_group'];


    if (checkbox1.checked) {
        $(checkbox1).trigger('click.self');
    }
    //Test funzionamento radio group. issue: #13
    checkbox1.checked = false;
    ok(!group.allowed, 'Gruppo disabilitato');
    $(checkbox1).trigger('click.self');
    stop();
    setTimeout(function() {
        ok(group.allowed, 'Gruppo abilitato');

        //Current check null!
        equal(group.current_check, null, 'Nessuna selezione');
        ok(!textbox1_node.allowed && textbox1.disabled, 'textbox1 disabilitato');
        ok(!textbox2_node.allowed && textbox2.disabled, 'textbox2 disabilitato');

        radio1.checked = true;
        $(radio1).trigger('click.self');
        //stop(); //pausa
        setTimeout(function() {
            equal(group.checked_element(), text_group1, 'Elemento selezionato, checked_element()');
            equal(group.current_check, text_group1, 'Elemento selezionato group.current_check');

            ok(textbox1_node.allowed, 'textbox1 abilitato');
            ok(textbox2_node.allowed, 'textbox2 abilitato');
            ok(!textbox5_node.allowed, 'disabilitato');
            start();
        }, 200);
    }, 100);

});

test('Input non svuotati, issue #34', function() {
    var checkbox1 = document.getElementById('checkbox1'),
        checkbox1_node = validator.tree['checkbox1'],
        radio1 = document.getElementById('text_group1'),
        radio3 = document.getElementById('text_group3'),
        textbox1 = document.getElementById('textbox1'),
        textbox2 = document.getElementById('textbox2');
    textbox1_node = validator.tree['textbox1'],
    textbox2_node = validator.tree['textbox2'],
    group = validator.tree['test_group'];

    ok(!textbox1_node.filled, 'Obbligatorietà');
    textbox1.value = 'prova';
    equal(textbox1_node.value(), 'prova', 'Valore dei campi settato');
    $(textbox1).trigger('change');
    ok(textbox1_node.filled, 'Obbligatorietà');

    textbox2.value = 'prova';
    $(textbox2).trigger('change');
    ok(textbox2_node.filled, 'Obbligatorietà');
    equal(textbox2_node.value(), 'prova', 'Valore dei campi settato');
    $(textbox2).trigger('change');
    ok(textbox2_node.filled, 'Obbligatorietà');


    checkbox1.checked = true;
    checkbox1_node.check();

    //stop();
    //setTimeout( function() {
    //Change radio;
    radio3.checked = true;
    group.update_radio();

    ok(!radio1.checked, 'Uncheck radio1');
    ok(radio3.checked, 'Check radio3');

    equal(textbox1_node.value(), '', 'Valore dei campi settato');
    equal(textbox2_node.value(), '', 'Valore dei campi settato');
    ok(textbox1.disabled, 'Disabilitati');
    ok(textbox2.disabled, 'Disabilitati');
    //    start();
    //}, 100);
});
test('Enable e disable', function() {
    ok(true, 'test');
});

module('Error');
module('Format');

formats = {
    number: {
        correct: [
            '',
            '123123',
            '12',
            '0'],
        error: [
            '-1',
            'asdad123',
            '123asdasd']
    },
    alphabetic: {
        correct: [
            'asdasd',
            'ADSDKS',
            '10',
            '_',
            'Ciao_Bello1234567890'],
        error: [
            '!sad',
            'asdias)(',
            'space space',
            ';']
    },
    alphanumeric: {
        correct: [''],
        error: []
    },
    alnumhyphen: {
        correct: [''],
        error: []
    },
    alnumhyphenat: {
        correct: [''],
        error: []
    },
    alphaspace: {
        correct: [''],
        error: []
    },
    email: {
        correct: [''],
        error: []
    },
    cap: {
        correct: [''],
        error: []
    },
    provincia: {
        correct: [''],
        error: []
    },
    cf: {
        correct: [
            'NDYFMT09D68L400W',
            'NDYGMN09E21G856U',
            'NDYLDJ82S04Z343D',
            'NDYLFL06B07L400X',
            'NDYLLN68D21Z314T',
            'NDYLLN68D21Z343U',
            'NDYMBY76C17Z998V',
            'NDYMDL02E26L400X',
            'NDYMMN68E10Z343L',
            'NDYMMS03M64L400X',
            'NDYMRO05R07G856B',
            'NDYMTP65E23Z343N',
            'NDYMYK65T24Z343Z',
            'NDYPBD73E08Z343A',
            'NDYSSN79L21Z343J',
            'NEECLR55H50L682G',
            'NEEDVD68B20D946O',
            'NEESNT24R60B749B',
            'NEXFDN61C30Z133E',
            'NFAZHR73C41Z330U',
            'NFFNFL68M30Z352G',
            'NFNCCT48A63B275Y',
            'NFNCML22P64F299L',
            'NFNCML54C70B275C',
            'NFNDGI52L08B275F',
            'NFNGLN28A31A089L',
            'NFNGPP47B07B275Y',
            'NFNGPP58C14B275B',
            'NFNMCR68S66H224C',
            'NFNMLE39E70B275U',
            'NFNMLE45S57B275J',
            'NFNMLE61B63D946H',
            'NFNMLE66B50D946F',
            'NFNMTN87R50A794D',
            'NFNNGL72H61B963F',
            'NFNNLL57L14G707R',
            'NFNPQL63L31A089C',
            'NFNRNG91L20A794W',
            'NFNRSO49C42B275Q',
            'NFNTTV38P11A089S',
            'NFRBLK58D05Z352B',
            'NFRLRA78A66A089Z',
            'NFRMRA48R27F471O',
            'NFRMRS75D62Z601V',
            'NFRSRN73H58F205A',
            'NFSCLL30H11I138F',
            'NFSMHL72T65F205W',
            'NFSPLA74R44A794D',
            'NGAGZN76A24L682N',
            'NGAMLN65T60L682G',
            'NGENSR62M44Z129R',
            'NGESRN84H15Z129U',
            'NGGSRG56D25L670S',
            'NGHDLL67S68Z103W',
            'NGHFDN14P09G273R',
            'NGHFNN69L54C523R',
            'NGHGLC75S30C523N',
            'NGHGPP37S22F205T',
            'NGHMRC70S06H501Z',
            'NGHNMR34L62E858I',
            'NGHRTI46A50F205X',
            'NGHSMN75S70C523C',
            'NGHVTR40E49F205F',
            'NGIPLA70L30G482N',
            'NGLCHR89T71H501F',
            'NGLCLN47M70A962T',
            'NGLCLN62A56C635Q',
            'NGLCML71H43D971I',
            'NGLCMN63T58I628H',
            'NGLCRL69P16L682D'],
        error: ['02598580161']
    },
    piva: {
        correct: ['02598580161'],
        error: ['NDYFMT09D68L400W']
    },
    cfpiva: {
        correct: ['',
            '02598580161',
            'NDYFMT09D68L400W'],
        error: [
            'a',
            '1',
            'a1']
    },
    catcom: {
        correct: [''],
        error: []
    },
    catcat: {
        correct: [''],
        error: []
    },
    date: {
        correct: ['21/03/2013',
            '10/10/1000',
            '31/12/9999'],
        error: ['a',
            '1',
            '10/30/1000']
    }
};

var format;

for (format in formats)(function(f) {

    test(f, function() {
        var input = validator.tree[f],
            format = formats[f],
            i = format.length,
            item;

        var correct, error, i;
        for (i in format.correct) {
            correct = format.correct[i];

            if (typeof correct !== 'string') {
                continue;
            }
            input.element.value = correct;
            input.check();

            ok(input.formatted, 'test ' + f + ': ' + correct);
        }

        for (i in format.error) {
            error = format.error[i];

            input.element.value = error;
            input.check();

            ok(!input.formatted, 'test error ' + f + ': ' + error);
        }
    });
})(format);
