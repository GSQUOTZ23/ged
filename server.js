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
   FUNÇÃO ASSINATURA (🔥 PROFISSIONAL)
======================== */
function getAssinatura(tipo){
    if(tipo === "Director"){
        return {
            nome: "Carlos Manuel Vieira",
            cargo: "Director",
            cabecalho: "Direcção de RH, em Luanda,"
        };
    }

    if(tipo === "Chefe Divisão A"){
        return {
            nome: "Ana Paula Domingos",
            cargo: "Chefe de Divisão",
            cabecalho: "Divisão de Gestão da Direcção de RH, em Luanda,"
        };
    }

    if(tipo === "Chefe Divisão B"){
        return {
            nome: "José Eduardo Neto",
            cargo: "Chefe de Divisão",
            cabecalho: "Divisão de Gestão da Direcção de RH, em Luanda,"
        };
    }

    return {
        nome: "Responsável",
        cargo: "",
        cabecalho: "Direcção de RH, em Luanda,"
    };
}

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
        pedido.assinante = req.body.assinante;

        pedido.documento = `http://localhost:3000/gerar-doc/${pedido.id}?salario=${req.body.salario}&extenso=${req.body.salarioExtenso}&assinante=${req.body.assinante}`;
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
    const assinanteTipo = req.query.assinante || "Responsável";

    const assinatura = getAssinatura(assinanteTipo);

    res.send(`
    <html>
    <head>
        <title>Declaração</title>
        <style>
body{
    font-family: Arial;
    padding:60px;
    max-width:800px;
    margin:auto;
}

/* TEXTO PRINCIPAL */
p{
    font-size:16px;
    line-height:1.8;
    text-align: justify;
    margin-bottom:15px;
}

/* TOPO */
.topo{
    display:flex;
    justify-content:space-between;
    margin-bottom:20px;
}

/* TÍTULO */
h2{
    text-align:center;
    margin:30px 0;
    letter-spacing:1px;
}

/* ASSINATURA */
.assinatura{
    margin-top:80px;
    text-align:center;
}

/* BOTÕES */
.botoes{
    position:fixed;
    top:10px;
    left:10px;
}

/* IMPRESSÃO */
@media print {
    .botoes{
        display:none;
    }

    body{
        padding:40px;
    }
}
</style>
    </head>

    <body>

        <div class="botoes">
            <button onclick="window.history.back()">⬅ Voltar</button>
            <button onclick="window.print()">🖨 Imprimir</button>
        </div>

   

        <h2 style="text-align:center;">DECLARAÇÃO DE SERVIÇO</h2>

        <p>
A pedido do interessado e para efeitos de apresentação em <b>${pedido.destino || "N/A"}</b>, 
declara-se que o Sr. <b>${pedido.nome || "N/A"}</b>, portador do Bilhete de Identidade nº 
<b>${pedido.bi || "N/A"}</b>, é trabalhador desta instituição, exercendo a função de 
<b>${pedido.funcao || "N/A"}</b>, com contrato por tempo indeterminado desde 
<b>${pedido.dataAdmissao || "N/A"}</b>, auferindo um salário mensal de 
<b>${salario} Kz</b> (${extenso}), encontrando-se em efetivo serviço.
</p>


        <p>
        ${assinatura.cabecalho} ${new Date().toLocaleDateString()}
        </p>

     <div class="assinatura">
    <b>${assinatura.cargo}</b><br><br>
    __________________________<br>
    <b>${assinatura.nome}</b>
</div>

        <hr>

        <h3>Upload Documento Assinado</h3>
        <input type="file" id="file"><br><br>
        <button onclick="upload(${pedido.id})">Enviar Documento</button>

        <script>
        async function upload(id){
            const file = document.getElementById("file").files[0];
            const formData = new FormData();
            formData.append("file", file);

            await fetch("/upload/" + id, {
                method: "POST",
                body: formData
            });

            alert("Documento enviado!");
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

app.get("/", (req, res) => {
    res.send("Sistema RH online 🚀");
});

/* ========================
   START
======================== */
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});