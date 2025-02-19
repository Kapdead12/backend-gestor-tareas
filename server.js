const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
 // Crear el servidor HTTP
const httpServer = http.createServer(app); 
const io = new Server(httpServer, {
  cors: { origin: "*" }, // Permitir conexiones desde cualquier origen
});

app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("Error al conectar MongoDB:", err));

// Modelo de Tarea
const TaskSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
});

const Task = mongoose.model("tasks", TaskSchema);

// 📢 Emitir la lista de tareas a todos los clientes conectados
const emitTasks = async () => {
  try {
    const tasks = await Task.find();
    //console.log("📋 Lista de tareas:", tasks);
    io.emit("taskList", tasks); // Emitir la lista de tareas a todos los clientes
  } catch (error) {
    console.error("Error al obtener tareas:", error);
  }
};

//============= Eventos de WebSockets=================
io.on("connection", (socket) => {
  console.log("🔗 Nuevo cliente conectado:", socket.id);

  // Enviar la lista de tareas a todos los clientes conectados
  emitTasks();

  // Manejar la adición de nuevas tareas
  socket.on("addTask", async (taskData) => {
    try {
      const newTask = new Task(taskData); // Crear nueva tarea con los datos recibidos
      await newTask.save(); // Guardar en la base de datos
      socket.emit("taskAdded");
      emitTasks(); // Emitir lista actualizada a todos los clientes
    } catch (error) {
      console.error("Error al agregar tarea:", error);
    }
  });

  // Manejar la eliminación de tareas
  socket.on("deleteTask", async (taskId) => {
    try {
      await Task.findByIdAndDelete(taskId);
      emitTasks(); // Emitir lista actualizada a todos los clientes
      socket.emit("taskDeleted", taskId);
    } catch (error) {
      console.error("Error al eliminar tarea:", error);
    }
  });

  socket.on("taskComplete", async (taskId) => {
    const task = await Task.findById(taskId);
    if (task) {
      task.completed = !task.completed; // Cambiar el estado
      await task.save();

      io.emit("taskUpdated", task); // 🔄 Notificar a todos los clientes
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});


//=================== Rutas de la API===================
// Obtener todas las tareas
app.get("/tasks", async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

/// Actualizar tarea y emitir evento
app.put("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    task.completed = !task.completed; // Alternar entre completado y no completado
    await task.save();
    io.emit("taskUpdated", task); // 🔥 Emitir evento
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar tarea" });
  }
});

// Agregar nueva tarea y emitir evento
app.post("/tasks", async (req, res) => {
  try {
    const newTask = new Task({ text: req.body.text, completed: false });
    const savedTask = await newTask.save();
    // 🔥 Emitir evento a todos los clientes
    io.emit("taskAdded", savedTask); 
    res.status(201).json({  
      message: "Tarea agregada con éxito",
      task: savedTask // 🚀 Enviamos el objeto completo
    });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar tarea" });
  }
});

// Eliminar tarea y emitir evento
app.delete("/tasks/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Tarea eliminada" });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));