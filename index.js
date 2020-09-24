let fs = require('fs');

let express = require('express');
let multer = require('multer');
let upload = multer({ dest: 'tmp/csv/' });
let csvjson = require("csvjson");
let swaggerUi = require('swagger-ui-express'),
    swaggerDocument = require('./swagger.json');

const app = express();
const readFile = require('fs').readFile;

let allStudents = {};
let CSectionPresentStudents = [];
let DSectionPresentStudents = [];
const host = process.env.HOST || "localhost";
const port = process.env.PORT || "8080";

readFile("source.csv", 'utf-8', (err, fileContent) => {
    if (err) {
        console.log(err);
        throw new Error(err);
    }
    allStudents = csvjson.toObject(fileContent);
    // allStudents = allStudents.map(s => s.Name.replace(/\s\s+/g, ' ').toLowerCase())
});

app.post('/api/11/attendance', upload.single("upfile"), (req, res) => {

    readFile(req.file.path, 'utf-8', (err, fileContent) => {
        if (err) {
            console.log(err);
            throw new Error(err);
        }
        const parsedAttendance = getNames(fileContent);
        const presentStudents = parsedAttendance.names;
        CSectionPresentStudents = presentStudents.filter(x => x.endsWith('c'));
        DSectionPresentStudents = presentStudents.filter(x => x.endsWith('d'));

        let ls = "Name,Section,Attendance\n";

        allStudents.forEach(student => {
            if (student.Name !== "") {
                ls += student.Name + "," + student.Section + "," + (isStudentPresent(student) ? 'P' : 'A') + "\n";
            }
        });
        const header = `attachment; filename=${parsedAttendance.date}.csv`;
        res.setHeader('Content-disposition', header);
        res.set('Content-Type', 'text/csv');
        res.send(ls);
        fs.unlinkSync(req.file.path);
    });

})

app.post('/api/11/:section/marks', upload.single("upfile"), (req, res) => {

    readFile(req.file.path, 'utf-8', (err, fileContent) => {
        if (err) {
            console.log(err);
            throw new Error(err);
        }
        const parsedAttendance = getNamesForMarks(fileContent);
        CSectionPresentStudents = parsedAttendance.filter(x => x.name.toLowerCase().endsWith('c'));
        DSectionPresentStudents = parsedAttendance.filter(x => x.name.toLowerCase().endsWith('d'));

        let ls = "Name,Section,Marks\n";
        let marks = "";
        allStudents.filter(s => s.Section.toLowerCase() == req.params.section.toLowerCase())
            .forEach(student => {
                if (student.Name !== "") {
                    const mark = getMarks(student);
                    ls += student.Name + "," + student.Section + "," + mark + "\n";
                    marks += mark + "\n";
                }
            });
        pbcopy(marks);
        const header = `attachment; filename=marks.csv`;
        res.setHeader('Content-disposition', header);
        res.set('Content-Type', 'text/csv');
        res.send(ls);
        fs.unlinkSync(req.file.path);
    });

})

function isStudentPresent(student) {
    let nameToSearch = student.Name.replace(/\s\s+/g, ' ').toLowerCase();
    let list = student.Section === 'D' ? DSectionPresentStudents : CSectionPresentStudents;

    return list.find(z => z.split(' ')[0] === nameToSearch.split(' ')[0]) != undefined;
}

function getMarks(student) {
    let nameToSearch = student.Name.replace(/\s\s+/g, ' ').toLowerCase();
    let list = student.Section === 'D' ? DSectionPresentStudents : CSectionPresentStudents;
    const children = list.find(z => z.name.split(' ')[0].toLowerCase() === nameToSearch.split(' ')[0].toLowerCase());
    if (children != undefined) {
        return children.marks;
    }
    return 0;
}

function getNames(wrongCSV) {
    let lines = wrongCSV.split('\n');
    let names = [];
    let date = "";

    lines.forEach(line => {
        const chunks = line.split('\t') || [""];
        chunks[0] = chunks[0].toString().toLowerCase().replace(/[\u0000\ufffd\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, '').replace(/\s\s+/g, ' ');
        if (chunks.length === 3 && chunks[0] !== "") {
            date = chunks[2].split(",")[0].toString().toLowerCase().replace(/[\u0000\ufffd\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, '').replace(/\s\s+/g, ' ');
            if (names.indexOf(chunks[0]) === -1) {
                names.push(chunks[0]);
            }
        }
    });
    return {
        names,
        date
    };
}

function getNamesForMarks(wrongCSV) {
    let lines = wrongCSV.split('\n');
    let names = [];

    lines.forEach(line => {
        const chunks = line.split(',') || [""];
        for (let z = 0; z < chunks.length; z++) {
            chunks[z] = chunks[z].toString().toLowerCase().replace(/[\u0000\ufffd\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, '').replace(/\s\s+/g, ' ');
        }
        names.push({ "name": chunks[0].toLowerCase().replace(/['"]+/g, '') + " " + (chunks[1] || "").toLowerCase().replace(/['"]+/g, ''), "marks": (chunks[3] || "").toLowerCase().replace(/['"]+/g, '') });
    });
    return names;
}

swaggerDocument.host = `${host}:${port}`;
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
let server = app.listen(port, function () {
    console.log("App listening at http://%s:%s", host, port)
});

function pbcopy(data) {
    try {
        var proc = require('child_process').spawn('pbcopy');
        proc.stdin.write(data);
        proc.stdin.end();
    } catch (e) {
        console.error(`Not able to copy to clipboard : ${e}`);
    }
    console.log(`Copied to clipboard!`);
}  