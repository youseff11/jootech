/*
 * زراير الذكاء الاصطناعي في لوحة الأدمن:
 *   ✨ تحسين بالذكاء الاصطناعي  → يحسّن صياغة النص العربي في نفس الخانة (مع زر تراجع)
 *   🌐 ترجمة من العربي          → يقرأ الخانة العربية المقابلة ويملأ الخانة الإنجليزية
 *
 * يعمل على: العنوان، الوصف المختصر، وكل فقرات المشروع (حتى المضافة ديناميكياً).
 */
(function () {
    'use strict';

    var ENDPOINT = 'ai-assist/'; // نسبي لصفحة الأدمن الحالية (add أو change)

    // صفحة التعديل تكون على /admin/store/project/<id>/change/ فنحتاج الرجوع لجذر الموديل
    function endpointUrl() {
        var p = window.location.pathname;
        var root = p.replace(/(add|\d+\/change)\/$/, '');
        return root + ENDPOINT;
    }

    function getCsrf() {
        var el = document.querySelector('input[name=csrfmiddlewaretoken]');
        return el ? el.value : '';
    }

    function styleBtn(btn, color) {
        btn.type = 'button';
        btn.style.cssText =
            'margin:6px 4px 0 0;padding:5px 14px;border:1px solid ' + color +
            ';background:transparent;color:' + color +
            ';border-radius:8px;cursor:pointer;font-size:12px;font-weight:bold;';
    }

    function showError(msg) {
        alert('⚠ ' + msg);
    }

    function callAI(mode, text, onDone) {
        return fetch(endpointUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrf(),
            },
            body: JSON.stringify({ mode: mode, text: text }),
        })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
            .then(function (res) {
                if (!res.ok || res.data.error) {
                    showError(res.data.error || 'حدث خطأ غير متوقع');
                    onDone(null);
                } else {
                    onDone(res.data.result);
                }
            })
            .catch(function () {
                showError('تعذر الاتصال بالسيرفر');
                onDone(null);
            });
    }

    function setLoading(btn, loading, idleLabel) {
        btn.disabled = loading;
        btn.style.opacity = loading ? '0.6' : '1';
        btn.textContent = loading ? '⏳ لحظات...' : idleLabel;
    }

    /* زر التحسين + زر التراجع لخانة عربية */
    function addImproveButton(field) {
        if (field.dataset.aiDone) return;
        field.dataset.aiDone = '1';

        var wrap = document.createElement('div');

        var improveBtn = document.createElement('button');
        var LABEL = '\u2728 تحسين بالذكاء الاصطناعي';
        improveBtn.textContent = LABEL;
        styleBtn(improveBtn, '#7c3aed');

        var undoBtn = document.createElement('button');
        undoBtn.textContent = '\u21a9 تراجع';
        styleBtn(undoBtn, '#6b7280');
        undoBtn.style.display = 'none';
        var previousValue = null;

        improveBtn.addEventListener('click', function () {
            setLoading(improveBtn, true, LABEL);
            callAI('improve', field.value, function (result) {
                setLoading(improveBtn, false, LABEL);
                if (result !== null) {
                    previousValue = field.value;
                    field.value = result;
                    undoBtn.style.display = 'inline-block';
                }
            });
        });

        undoBtn.addEventListener('click', function () {
            if (previousValue !== null) {
                field.value = previousValue;
                previousValue = null;
                undoBtn.style.display = 'none';
            }
        });

        wrap.appendChild(improveBtn);
        wrap.appendChild(undoBtn);
        field.parentNode.appendChild(wrap);
    }

    /* زر الترجمة لخانة إنجليزية — يقرأ من الخانة العربية المقابلة */
    function addTranslateButton(enField, arField) {
        if (enField.dataset.aiDone || !arField) return;
        enField.dataset.aiDone = '1';

        var btn = document.createElement('button');
        var LABEL = '\ud83c\udf10 ترجمة من العربي';
        btn.textContent = LABEL;
        styleBtn(btn, '#0891b2');

        btn.addEventListener('click', function () {
            if (!arField.value.trim()) {
                showError('اكتب النص العربي الأول ثم اضغط الترجمة.');
                return;
            }
            setLoading(btn, true, LABEL);
            callAI('translate', arField.value, function (result) {
                setLoading(btn, false, LABEL);
                if (result !== null) enField.value = result;
            });
        });

        enField.parentNode.appendChild(btn);
    }

    /* ربط كل الخانات الموجودة حالياً في الصفحة */
    function decorateAll() {
        // خانات المشروع الرئيسية
        var pairs = [
            ['id_title', 'id_title_en'],
            ['id_description', 'id_description_en'],
        ];
        pairs.forEach(function (pair) {
            var ar = document.getElementById(pair[0]);
            var en = document.getElementById(pair[1]);
            if (ar) addImproveButton(ar);
            if (en) addTranslateButton(en, ar);
        });

        // فقرات المشروع (inline) — الأسماء بصيغة paragraphs-N-text / paragraphs-N-text_en
        document.querySelectorAll('textarea[name$="-text"]').forEach(function (arField) {
            addImproveButton(arField);
            var enName = arField.name + '_en';
            var enField = document.querySelector('[name="' + enName + '"]');
            if (enField) addTranslateButton(enField, arField);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        decorateAll();

        // دعم الفقرات المضافة ديناميكياً بزر "إضافة فقرة أخرى"
        if (window.django && window.django.jQuery) {
            window.django.jQuery(document).on('formset:added', function () {
                decorateAll();
            });
        }
    });
})();
