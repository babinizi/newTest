var textMessage = $('#textMessage');
let input = document.querySelector('#textMessage');

var name = prompt();
let receiverName;
var socket = io.connect();

var recipient; //Получатель (переменная) используется везде где надо
var messageCounter = 0;

const userListContainer = document.getElementById('allUsers');

socket.emit('userList', {name: name});

socket.on('userList', (userList) => {
	const usersHTML = userList.map(({ id, name }) => `
    <div class="left-bar__item item">
							<div class="item__content">
								<div class="item__image">
									<div class="item__image-counter ">0</div>
									<img src="img/Image.png" alt="human">
								</div>
								<div class="item__info">
									<div class="item__text">
										<div class="item__name">${id == socket.id ? name + " (Вы)" : name}</div>
										<div class="item__date">~</div>
									</div>
									<div class="item__description">
										Сообщений пока что нет
									</div>
									<input type="text" class="re" hidden value="${id}">
								</div>
							</div>
						</div>
  `).join('');
  userListContainer.innerHTML = usersHTML;
});


//Выбор чата слева
$('.left-bar__items').on('click', '.item', function() {
		// Удаляем класс _active у других элементов
    $('.left-bar__items .item').find('.item__content').not(this).removeClass('_active');

    // Добавляем класс _active к текущему элементу
    $(this).find('.item__content').addClass('_active');

		if ($(this).find('.item__image-counter').hasClass('_active')) {
			$(this).find('.item__image-counter').removeClass('_active');
		}

		$('.hellWindow').css('display', 'none');

    recipient = $(this).find('.re').val();
		receiverName = $(this).find('.item__name').html();
		$('.right-header__name').text(receiverName);

		input.focus();
		socket.emit('isRead', {sender: socket.id, receiver:recipient});
		socket.emit('join', {receiver: recipient, sender: socket.id});
});

//Вывод сообщений между пользователя
socket.on('show message', (data) => {
  const { allMessages } = data;

  // Обновляем контейнер со всеми сообщениями активного чата
  const allMessagesContainer = document.getElementById('allMessages');
  allMessagesContainer.innerHTML = '';

  allMessages.forEach(data => {
    if ((data.sender === socket.id && data.recipient === recipient) || (data.sender === recipient && data.recipient === socket.id)) {
			const lastMessageObj = allMessages
			  .filter(data => (data.sender === socket.id && data.recipient === recipient) || (data.sender === recipient && data.recipient === socket.id))
			  .findLast(data => true);
			const lastMessage = lastMessageObj ? lastMessageObj.message : '';
			const lastMessageTime = lastMessageObj ? lastMessageObj.time : '';

			const activeChatContainer = document.querySelector(`.left-bar__item.item input.re[value="${recipient}"]`).closest('.item__content');
			activeChatContainer.querySelector('.item__description').innerHTML = lastMessage;
			activeChatContainer.querySelector('.item__date').innerHTML = lastMessageTime;


      const messageElement = document.createElement('div');
      messageElement.classList.add('right-main__item')
      messageElement.classList.add('main-item');
      if (data.sender === socket.id) {
        messageElement.classList.add('rigth');
      }
      messageElement.innerHTML = `
          <div class="main-item__info">
              <div class="main-item__image">
                  <img src="img/man.png" alt="">
              </div>
              <div class="main-item__name">${data.senderName}</div>
							<div class="main-item__date">${data.time} ${data.sender == socket.id ? `<i class="fa-solid fa-check-double" ${data.isRead == true ? "style='color:orange'" : ""}></i>` : ""}</div>
          </div>
          <div class="main-item__text">${data.message} <input class="reading" hidden value="${data.messageId}"></div>
      `;
      allMessagesContainer.append(messageElement);
    }
  });

  // Прокручиваем контейнер со всеми сообщениями до конца
  let myDiv = document.getElementById('allMessagesMainContainer');
  myDiv.scrollTop = myDiv.scrollHeight - myDiv.clientHeight;
});



let timerId;

function startTimer() {
  timerId = setTimeout(function() {
	  socket.emit('type', {status: false, receiver: recipient, sender: socket.id});

	}, 2000);
}


input.addEventListener('blur', function(event) {
		socket.emit('type', {status: false, receiver: recipient, sender: socket.id});
});

input.addEventListener('keydown', function(event) {
	socket.emit('type', {status:true, receiver: recipient, sender: socket.id});

	clearTimeout(timerId);
	startTimer();

	//Отправка на Enter
  if (event.keyCode === 13) {
    if (textMessage.val() != '') {
			socket.emit('message', {mes: textMessage.val(), sender: socket.id, receiver: recipient});
		}

		textMessage.val('');
  }
});


$('.footer-content__send').click(function () {
	if (textMessage.val() != '') {
		socket.emit('message', {mes: textMessage.val(), sender: socket.id, receiver: recipient});
	}
	textMessage.val('');
})

socket.on('add type', function(data) {
	if (data.id != socket.id) {
		addType(data);
	}
});


function addType(data) {
	if (data.status == true) {
		$('#typing-status').css('display', 'flex');
	} else {
		$('#typing-status').css('display', 'none');
	}

}

socket.on('updateChatInfo', (data) => {
	const {allMessages, idSender} = data;

	const senderContainer = document.querySelector(`.left-bar__item.item input.re[value="${idSender}"]`).closest('.item__content');
	const senderContainerVal = document.querySelector(`.left-bar__item.item input.re[value="${idSender}"]`).value;

	const lastMessageObj = allMessages
		.filter(data => (data.sender === socket.id && data.recipient === senderContainerVal) || (data.sender === senderContainerVal && data.recipient === socket.id))
		.findLast(data => true);
	const lastMessage = lastMessageObj ? lastMessageObj.message : '';
	const lastMessageTime = lastMessageObj ? lastMessageObj.time : '';

	if (senderContainer.classList.contains('_active')) {
		socket.emit('isRead', {sender: socket.id, receiver:recipient});
		return;
	}
	const itemImageCounter = senderContainer.querySelector('.item__image-counter');
	if (!itemImageCounter.classList.contains('_active')) {
	  itemImageCounter.classList.add('_active');
		itemImageCounter.innerHTML = 0;
	}
	let counter = itemImageCounter.innerHTML;
	counter++;
	itemImageCounter.innerHTML = counter;
	senderContainer.querySelector('.item__description').innerHTML = lastMessage;
	senderContainer.querySelector('.item__date').innerHTML = lastMessageTime;
	// Получаем родительский элемент
	const senderParent = senderContainer.parentNode.parentNode;

	// Перемещаем элемент в начало родительского элемента
	senderParent.insertBefore(senderContainer.parentNode, senderParent.firstChild);


})
