$(document).ready(function() {
    // Проверка и установка темы
    if (localStorage.getItem('theme') === 'dark') {
        $('body').addClass('dark-theme');
    }

    // Переключение темы
    $('#toggle-theme').on('click', function() {
        $('body').toggleClass('dark-theme');
        if ($('body').hasClass('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.removeItem('theme');
        }
    });

    // Кнопка выхода
    $('#logout').on('click', function() {
        window.location.href = 'index.html';
    });

    // Загрузка данных о пилотах для таблицы
    if ($('#pilots-table').length) {
        $.getJSON('pilots.json', function(data) {
            let pilots = data.pilots;
            let tableBody = $('#pilots-table');

            pilots.forEach(function(pilot) {
                tableBody.append(`
                    <tr>
                        <td>${pilot.name}</td>
                        <td>${pilot.age}</td>
                        <td>${pilot.medical}</td>
                        <td>${pilot.vlek}</td>
                        <td>${pilot.attestation}</td>
                        <td>${pilot.cpl}</td>
                        <td>${pilot.rwt}</td>
                        <td>${pilot.cfc}</td>
                        <td>${pilot.act}</td>
                        <td>${pilot.faction}</td>
                    </tr>
                `);
            });
        });
    }

    // Загрузка данных о технике
    if ($('#equipment').length) {
        $.getJSON('planes.json', function(data) {
            let planes = data.planes;
            let list = $('#equipment');

            planes.forEach(function(plane) {
                list.append(`<li>${plane.type} - ${plane.id}</li>`);
            });
        });
    }
});
