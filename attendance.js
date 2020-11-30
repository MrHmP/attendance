var fs = require('fs');
let csvjson = require("csvjson");
let filesToConsider = {}
let attendance = {}
const clipboardy = require('clipboardy');

function getStudentsList(mainFile) {
    data = fs.readFileSync(mainFile, 'utf-8')
    students = csvjson.toObject(data);
    students.forEach(s => {
        attendance[s.Name] = {
            'section': s.Section.toLowerCase()
        }
    });
}

function readFiles(dirname, onError) {
    fs.readdir(dirname, function (err, filenames) {
        if (err) {
            onError(err);
            return;
        }
        getUniqueAttendanceFiles(filenames, dirname);

        let csv = "name,section,";
        Object.keys(filesToConsider).forEach(k => {
            console.log('reading ' + filesToConsider[k].name)
            csv += k + ",";
            let rawAttendance = makeDataRedable(fs.readFileSync(dirname + filesToConsider[k].name))
            let parsedAttendance = csvjson.toObject(rawAttendance, { delimiter: "\t" });

            Object.keys(attendance).forEach(sName => {
                let nameToSearch = sName.toLowerCase();
                let isPresent = parsedAttendance.find(z =>
                    z['full name'].split(' ')[0] === nameToSearch.split(' ')[0] &&
                    z['full name'].endsWith(attendance[sName].section)) != undefined;

                attendance[sName][k] = isPresent ? 'P' : 'A';
            });

        })
        csv = convertJsonToCSV(csv);
        console.log(csv)
        clipboardy.writeSync(csv);
    });
}

function convertJsonToCSV(csv) {
    csv = csv.slice(0, -1) + "\n";
    Object.keys(attendance).forEach(element => {
        line = element + ",";
        Object.keys(attendance[element]).forEach(prop => {
            line += attendance[element][prop] + ",";
        });
        csv += line.slice(0, -1) + "\n";
    });
    return csv;
}

function getUniqueAttendanceFiles(filenames, dirname) {
    filenames.forEach(function (filename) {
        let content = fs.readFileSync(dirname + filename, 'utf-8');
        content = makeDataRedable(content);
        allStudents = csvjson.toObject(content, { delimiter: "\t" });
        let found = false;
        let timeSTamp = '';
        allStudents.forEach(element => {
            if (!found && element['full name'].endsWith('XII-E'.toLowerCase())) {
                found = true;
                timeSTamp = element['timestamp'];
            }
        });
        if (found) {
            var stats = fs.statSync(dirname + filename);
            if (filesToConsider[timeSTamp.split(",")[0]]) {
                if (filesToConsider[timeSTamp.split(",")[0]]['size'] < stats.size) {
                    filesToConsider[timeSTamp.split(",")[0]]['size'] = stats.size;
                }
            } else {
                filesToConsider[timeSTamp.split(",")[0]] = { 'name': filename, 'size': stats.size };
            }
        }
    });
}

function makeDataRedable(data) {
    return data.toString().toLowerCase().replace(/[\u0000\ufffd\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, '').replace(/\s\s+/g, ' ')
}

getStudentsList(`${process.argv[3]}.csv`)
readFiles(process.argv[2], console.log)