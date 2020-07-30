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

app.post('/api/fileanalyse', upload.single("upfile"), (req, res) => {

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

function isStudentPresent(student) {
    let nameToSearch = student.Name.replace(/\s\s+/g, ' ').toLowerCase();
    let list = student.Section === 'D' ? DSectionPresentStudents : CSectionPresentStudents;

    return list.find(z => z.split(' ')[0] === nameToSearch.split(' ')[0]) != undefined;
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

swaggerDocument.host = `${host}:${port}`;
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
let server = app.listen(port, function () {
    console.log("App listening at http://%s:%s", host, port)
});