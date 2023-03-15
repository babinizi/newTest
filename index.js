const express = require('express');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const PORT = 3000;

const connections = [];

app.use(express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

let allMessages = [];

io.on('connection', (socket) => {
  console.log(`Successful connection, id - ${socket.id}`);

  const users = Array.from(connections).map((conn) => ({ id: conn.id, name: conn.data.username }));
  socket.emit('userList', users);

  //Вывод подключенных пользоватлей в сайдбар
  socket.on('userList', (data) => {
    socket.data.username = data.name;
    connections.push(socket);

    const users = Array.from(connections).map((conn) => ({ id: conn.id, name: conn.data.username }));
    io.emit('userList', users);
  });

  // добавляем подключенного пользователя в комнату
  socket.on('join', (data) => {
    const { receiver, sender  } = data;

    socket.join(`${sender}-${receiver}`);

    io.to(`${sender}-${receiver}`).emit('show message', {allMessages: allMessages});
  });


  // обрабатываем полученное сообщение и отправляем его получателю
  socket.on('message', (data) => {
    let now = new Date();
  	let hours = now.getHours();
  	let minutes = now.getMinutes().toString().padStart(2, '0');

    const { mes,sender,receiver } = data;

    const senderName = getUsernameById(sender);
    const receiverName = getUsernameById(receiver);
    let messageObj = {
      messageId: Math.random(),
      sender: data.sender,
      recipient: data.receiver,
      senderName: senderName,
      receiverName: receiverName,
      message: data.mes,
      time: hours + ":" + minutes,
      isRead:false,
    };
    allMessages.push(messageObj);

    io.to(`${receiver}-${sender}`).emit('show message', {allMessages: allMessages});

    socket.emit('show message', {allMessages: allMessages});
    io.to(receiver).emit('updateChatInfo', {allMessages: allMessages, idSender: socket.id, receiver: receiver});
  });

  socket.on('disconnect', () => {
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected');

    io.emit('userLeft', socket.id );

    const users = Array.from(connections).map((conn) => ({ id: conn.id, name: conn.data.username }));
    io.emit('userList', users);
  });

  //Функция "Печатает..."
  socket.on('type', (data) => {
    const {receiver, sender, status} = data;

    io.to(`${receiver}`).emit('add type', { status: status, id: sender});
  });

  socket.on('isRead', (data) => {
    const lastMessage = allMessages[allMessages.length - 1];

    if (!lastMessage) return;

    if (lastMessage.sender == socket.id) return;

    allMessages.forEach((message) => {
      if ((message.sender === data.sender && message.recipient === data.receiver) || (message.sender === data.receiver && message.recipient === data.sender)) {
        message.isRead = true;
      }
    });

    // Проверяем, открыт ли чат получателем
    const room = io.sockets.adapter.rooms.get(`${data.receiver}-${data.sender}`);
    if (room && room.size > 0) {
      // Если чат открыт, отправляем обновленный список сообщений только получателю
      io.to(`${data.receiver}-${data.sender}`).emit('show message', { allMessages: allMessages });
    }
  });
});



// получаем имя пользователя по id
function getUsernameById(id) {
  const connection = connections.find(conn => conn.id === id);
  if (connection) {
    return connection.data.username;
  }
  return null; // если пользователь не найден
}



server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
