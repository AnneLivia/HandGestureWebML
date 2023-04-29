// Executar quando html tiver sido carregado
document.addEventListener('DOMContentLoaded', async () => {
  // criando novo jogo
  const snakeGame = new SnakeGame(18, 18, 19, 100, {
    boardColor: '#ededed',
    snakeColor: '#573dff',
    foodColor: '#ff2626',
  });

  // divs para controlar exibição de jogo e exibição de video
  const gameArea = document.querySelector('#gameArea');
  const videoArea = document.querySelector('#videoArea');

  // botão para reiniciar jogo
  const btRestartGame = document.querySelector('#btRestartGame');

  // div para exibir mensagem de erro caso a webcam não possa ser executada pelo browser
  const errorVideoIndicatorArea = document.querySelector(
    '#errorVideoIndicatorArea'
  );

  // div para exibir feedbacks gerais da aplicação como modelo pronto, modelo carregado, etc.
  const modelFeedbackIndicatorArea = document.querySelector(
    '#modelFeedbackIndicatorArea'
  );

  // card referente a inserção de exemplo
  const insertNewExamplesArea = document.querySelector(
    '#insertNewExamplesArea'
  );

  // card referente a exibição das classes detectadas
  const detectedGestureIndicatorArea = document.querySelector(
    '#detectedGestureIndicatorArea'
  );

  // para mostrar a imagem das classes detectadas
  const recognizedClassImage = document.querySelector('#recognizedClassImage');

  // div de video para exibição da webcam
  const video = document.querySelector('#webcam');

  // referencia para todos os botões de exemplos
  const btUp = document.querySelector('#btAddExampleUp');
  const btDown = document.querySelector('#btAddExampleDown');
  const btLeft = document.querySelector('#btAddExampleLeft');
  const btRight = document.querySelector('#btAddExampleRight');
  const btNegative = document.querySelector('#btAddExampleNegative');

  // botões para manipulação do modelo
  const btSaveModel = document.querySelector('#btSaveModel');
  const btLoadModel = document.querySelector('#btLoadModel');

  // botões para iniciar classificação e parar caso haja modelo treinado ou carregado
  const btStartClassification = document.querySelector(
    '#btStartClassification'
  );

  const btStoplassification = document.querySelector('#btStoplassification');

  // input referente a inserção dos arquivos do modelo baixado (model.json)
  const modelDataFile = document.querySelector('#modelDataFile');

  // para mostrar quantidade de exemplos inseridos
  // cada key possui a quantidade para concatenar na medida em que novos itens
  // são inseridos e o documento referente ao span para exibição do número na interface
  const totalExamplesAddedToTrain = {
    up: document.querySelector('#numberExamplesUp'),
    left: document.querySelector('#numberExamplesLeft'),
    right: document.querySelector('#numberExamplesRight'),
    down: document.querySelector('#numberExamplesDown'),
    negative: document.querySelector('#numberExamplesNegative'),
  };

  // variavel para determinar se é para classificar (quando iniciar classificao for precionada) ou
  // parar classificação (quando botão correspondente a essa opção for acionado)
  let shouldClassify = false;

  // para permitir adicionar exemplo de classe, apenas quando o modelo MobileNet tiver sido carregado
  let mobileNetLoaded = false;

  // para precionar as arrow keys
  const keys = {
    up: new KeyboardEvent('keydown', {
      key: 'ArrowUp',
    }),
    down: new KeyboardEvent('keydown', {
      key: 'ArrowDown',
    }),

    left: new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
    }),
    right: new KeyboardEvent('keydown', {
      key: 'ArrowRight',
    }),
  };

  // verificar se a webcam é suportada pelo browser
  if (navigator.mediaDevices.getUserMedia) {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      video.srcObject = videoStream;

      // deixando a imagem espelhada, através de um flip na horizontal
      video.style.webkitTransform = 'scaleX(-1)';
      video.style.transform = 'scaleX(-1)';

      video.style.filter = 'contrast(200%)';
      video.style.filter = 'grayscale(100%)';

      video.play();
      // exibindo video e card com indicação de gesto
      video.classList.remove('hide');
      insertNewExamplesArea.classList.remove('hide');
    } catch (error) {
      errorVideoIndicatorArea.classList.remove('hide');
      errorVideoIndicatorArea.innerHTML =
        "<img src='./assets/images/no-video.png' alt='No video icon' />" +
        "<p class='mt-3'>Não foi possível acessar a sua Webcam</p>";

      // desabilitar botões de iniciar e parar classificação
      btStartClassification.disabled = true;
      btStoplassification.disabled = true;

      console.error(error.message);
    }
  }

  // criar o modelo de classificação com KNN
  const knnModelClassifier = ml5.KNNClassifier();

  // Primeiro passo de transfer learning é extrair features já aprendidas do MobileNet
  const featureExtractor = ml5.featureExtractor(
    'MobileNet',
    () => {
      console.log('Modelo carregado!');
      mobileNetLoaded = true;
    }
  );

  const addNewTrainData = async (label) => {
    if (mobileNetLoaded) {
      // Obtendo as caracteristicas através dos frames do vídeo (webcam)
      const features = featureExtractor.infer(video);

      // adicionando as caractisticas obtidas dos frames e colocando no KNN
      knnModelClassifier.addExample(features, label);

      // o metodo getCountByLabel retorna um objeto com a quantidade de exemplos já adicionados
      const totalExamplesPerLabel = knnModelClassifier.getCountByLabel();

      // atualizando a quantidade de uma label especifica e exibindo na tela
      totalExamplesAddedToTrain[label].innerText = totalExamplesPerLabel[label];
    }
  };

  const btUsedToaddTrainData = [
    {
      element: btDown,
      label: 'down',
    },
    {
      element: btLeft,
      label: 'left',
    },
    {
      element: btUp,
      label: 'up',
    },
    {
      element: btRight,
      label: 'right',
    },
    {
      element: btNegative,
      label: 'negative',
    },
  ];

  // inserindo os eventos de inserir imagem para cada label
  btUsedToaddTrainData.forEach((btn) => {
    let intervalAddExamples = null;

    btn.element.addEventListener('mouseover', () => {
      // chama a função a cada segundo
      intervalAddExamples = setInterval(() => {
        addNewTrainData(btn.label);
      }, 100);
    });
    
    btn.element.addEventListener('mouseout', () => {
      clearInterval(intervalAddExamples);
    });
  });

  // metodo usado para controlar as arrow keys do teclado
  const controlArrowKeysBasedOnALabel = (label) => {
    // se não for a classe negativa, pode executar porque é a arrow key
    if (label !== 'negative') {
      document.dispatchEvent(keys[label]);
    }
  };

  // metodo usado dentro de classify para exibir resultado ou erro caso haja algum
  const getLabelsReturnedFromModel = (error, result) => {
    if (error) {
      return console.log(error.message);
    }

    // controlando tecla
    controlArrowKeysBasedOnALabel(result.label);

    // ao reconhecer alguma classe, colocar a imagem especifica
    recognizedClassImage.src = `./assets/images/${result.label}.png`;

    console.log(`Label: ${result.label} - ${result.confidence}`);

    // se usuário não tiver apertado em parar classificação, continuar em loop
    if (shouldClassify)
      classifyGesture();
  };

  const classifyGesture = () => {
     // Get the features of the input video
     const features = featureExtractor.infer(video);
     return knnModelClassifier.classify(features, getLabelsReturnedFromModel);
  }

  btStartClassification.addEventListener('click', () => {
    // getNumLabels, retorna o número total de labels adicionados no modelo
    const qtdLabels = knnModelClassifier.getNumLabels();
    // se modelo customizado existe ou usuário colocou algum outro modelo, deve-se iniciar classificiação
    if (qtdLabels > 0) {
      // iniciar jogo
      // videoArea.classList.add('hide');
      gameArea.classList.remove('hide');
      snakeGame.startGame();
      // para ficar em loop a classificação
      shouldClassify = true;
      // para mostrar os resultados da classificação com imagens e esconder a área referente a inserção de exemplos
      detectedGestureIndicatorArea.classList.remove('hide');
      insertNewExamplesArea.classList.add('hide');

      classifyGesture();
    }

    // se chegou aqui é porque não existe modelo para ser usado.
    modelFeedbackIndicatorArea.classList.remove('hide');
    modelFeedbackIndicatorArea.innerText =
      'Adicione imagens de exemplos antes de iniciar a classificação';
  });

  btStoplassification.addEventListener('click', () => {
    // parar jogo
    videoArea.classList.remove('hide');
    gameArea.classList.add('hide');
    // esconde card de exibição de resultados e exibe card para efetuar treinamento
    detectedGestureIndicatorArea.classList.add('hide');
    insertNewExamplesArea.classList.remove('hide');
    // evita que o loop de classificação continue
    shouldClassify = false;
  });

  btSaveModel.addEventListener('click', () => {
    // so salvar model, se houver algum modelo customizado
    if (knnModelClassifier.getNumLabels() > 0) return knnModelClassifier.save();

    modelFeedbackIndicatorArea.classList.remove('hide');
    modelFeedbackIndicatorArea.innerText =
      'Adicione imagens de exemplos antes de salvar o modelo';
  });

  // FIX ==========================================================
  
  // botão que abri janela para inserção de arquivos do modelo
  btLoadModel.addEventListener('click', () => {
    modelDataFile.click();
  });

  // falta carregar modelo
  modelDataFile.addEventListener('change', async (e) => {
    if (knnModelClassifier) {
      modelFeedbackIndicatorArea.classList.remove('hide');
      try {
        // passando os arquivos weights e model.json
        await knnModelClassifier.load(e.target.files);
        // informando que modelo foi carregado na interface
        modelFeedbackIndicatorArea.innerText = 'Modelo carregado com sucesso';
        // para permitir que o modelo carregado possa ser usado na classificação em loop quando
        // usuario clicar em classificar
        modelLoaded = true;
      } catch (error) {
        modelFeedbackIndicatorArea.innerText = 'Erro ao carregar o modelo';
        console.log(error);
      }
    }
  });

  // FIX ==========================================================

  // Os Códigos abaixo incluem hover effects em todos os botões
  const listOfButtonsElementsToAddHover = [
    btSaveModel,
    btLoadModel,
    btStartClassification,
    btStoplassification,
    btDown,
    btLeft,
    btUp,
    btRight,
    btNegative,
  ];

  listOfButtonsElementsToAddHover.forEach((element) => {
    const animation = 'fa-beat-fade';

    element.addEventListener('mouseover', () => {
      // obtendo primeiro elemento do botão que é o <i> e colocando a animação
      element.firstElementChild.classList.add(animation);
    });

    element.addEventListener('mouseout', () => {
      // obtendo primeiro elemento do botão que é o <i> e removendo a animação
      element.firstElementChild.classList.remove(animation);
    });
  });

  btRestartGame.addEventListener('click', () => {
    snakeGame.restartGame();
  });
});
