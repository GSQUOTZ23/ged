const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

/* ========================
   GARANTIR PASTA UPLOADS
======================== */
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

/* ========================
   STORAGE UPLOAD
======================== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));

/* ========================
   DADOS
======================== */
let users = [
    {
        id: 1,
        nome: "Admin",
        email: "admin@gmail.com",
        senha: "123",
        role: "staff"
    }
];

let pedidos = [];
let id = 1;

/* ========================
   REGISTRO
======================== */
app.post("/register", (req, res) => {
    const { nome, email, senha } = req.body;

    if(users.find(u => u.email === email)){
        return res.status(400).json({ message: "Email já existe" });
    }

    users.push({
        id: users.length + 1,
        nome,
        email,
        senha,
        role: email === "admin@gmail.com" ? "staff" : "user"
    });

    res.json({ message: "Conta criada" });
});

/* ========================
   LOGIN
======================== */
app.post("/login", (req, res) => {
    const { email, senha } = req.body;

    const user = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
    );

    if(!user){
        return res.status(400).json({ message: "Credenciais inválidas" });
    }

    res.json({ user });
});

/* ========================
   CRIAR PEDIDO
======================== */
app.post("/pedidos", (req, res) => {
    const pedido = {
        id: id++,
        ...req.body,
        status: "Pendente",
        createdAt: new Date()
    };

    pedidos.push(pedido);
    res.json(pedido);
});

/* ========================
   LISTAR
======================== */
app.get("/pedidos", (req, res) => {
    res.json(pedidos);
});

/* ========================
   ATUALIZAR
======================== */
app.put("/pedido/:id", (req, res) => {

    const pedido = pedidos.find(p => p.id === Number(req.params.id));

    if(!pedido){
        return res.status(404).json({ message: "Não encontrado" });
    }

    Object.assign(pedido, req.body);

    if(req.body.status === "Aprovado"){
        pedido.salario = req.body.salario;
        pedido.salarioExtenso = req.body.salarioExtenso;

        pedido.documento = `http://localhost:3000/gerar-doc/${pedido.id}?salario=${req.body.salario}&extenso=${req.body.salarioExtenso}`;
    }

    res.json(pedido);
});

/* ========================
   GERAR DOCUMENTO
======================== */
app.get("/gerar-doc/:id", (req, res) => {

    const pedido = pedidos.find(p => p.id === Number(req.params.id));

    if(!pedido){
        return res.send("Pedido não encontrado");
    }

    const salario = req.query.salario || "N/A";
    const extenso = req.query.extenso || "N/A";

    res.send(`
    <html>
    <head>
        <title>Declaração</title>

        <style>
            body{
                font-family: Arial;
                padding: 60px;
                background: white;
            }

            .topo{
                display:flex;
                align-items:center;
                justify-content:space-between;
            }

            .logo{
                font-size:28px;
                font-weight:bold;
            }

            .empresa{
                font-size:14px;
                text-align:right;
            }

            h2{
                text-align:center;
                margin-top:40px;
                margin-bottom:30px;
            }

            p{
                font-size:16px;
                line-height:1.6;
                text-align:justify;
            }

            .assinatura{
                margin-top:80px;
                text-align:center;
            }

            .botoes{
                position:fixed;
                top:10px;
                left:10px;
            }

            button{
                margin-right:10px;
                padding:6px 10px;
                cursor:pointer;
            }

            @media print {
                .botoes{
                    display:none;
                }
            }
        </style>
    </head>

    <body>

        <!-- BOTÕES -->
        <div class="botoes">
            <button onclick="window.history.back()">⬅ Voltar</button>
            <button onclick="window.print()">🖨 Imprimir</button>
        </div>

        <!-- TOPO -->
        <div class="topo">
            <div class="logo">ENN</div>

            <div class="empresa">
                Engenharia e Construção Civil<br>
                Luanda - Angola<br>
                Tel: 900000000
            </div>
        </div>

        <!-- TÍTULO -->
        <h2>DECLARAÇÃO DE SERVIÇO</h2>

        <!-- TEXTO -->
        <p>
        Para devido efeito, declara-se que o Sr(a). <b>${pedido.nome || "N/A"}</b>,
        portador(a) do BI nº <b>${pedido.bi || "N/A"}</b>, encontra-se vinculado(a)
        a esta instituição.
        </p>

        <p>
        O mesmo exerce funções nesta organização e aufere um salário mensal de
        <b>${salario} Kz</b> (${extenso}).
        </p>

        <p>
        A presente declaração é emitida para os fins que se julgar conveniente.
        </p>

        <!-- DATA -->
        <p style="margin-top:40px;">
        Luanda, ${new Date().toLocaleDateString()}
        </p>

        <!-- ASSINATURA -->
        <div class="assinatura">
            __________________________<br>
            Assinatura e Carimbo
        </div>

        <hr>

        <!-- UPLOAD -->
        <h3>Upload Documento Assinado</h3>

        <input type="file" id="file">
        <br><br>

        <button onclick="upload(${pedido.id})">Enviar Documento</button>

        <script>
            async function upload(id){
                const file = document.getElementById("file").files[0];

                if(!file){
                    alert("Selecione um arquivo");
                    return;
                }

                const formData = new FormData();
                formData.append("file", file);

                await fetch("/upload/" + id, {
                    method: "POST",
                    body: formData
                });

                alert("Documento assinado enviado!");
            }
        </script>

    </body>
    </html>
    `);
});

/* ========================
   UPLOAD
======================== */
app.post("/upload/:id", upload.single("file"), (req, res) => {

    const pedido = pedidos.find(p => p.id === Number(req.params.id));

    if(!pedido){
        return res.status(404).json({ message: "Pedido não encontrado" });
    }

    pedido.documentoAssinado = req.file.filename;

    res.json({ message: "Upload feito" });
});

/* ========================
   START
======================== */
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});