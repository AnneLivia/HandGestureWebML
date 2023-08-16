// Executar quando html tiver sido carregado
document.addEventListener('DOMContentLoaded', async () => {

  // divs para controlar exibição de jogo
  const gameArea = document.querySelector('#gameArea');

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

  // referência para todos os botões de exemplos
  const btUsedToaddTrainData = [
    {
      element: document.querySelector('#btAddExampleDown'),
      label: 'down',
    },
    {
      element: document.querySelector('#btAddExampleLeft'),
      label: 'left',
    },
    {
      element: document.querySelector('#btAddExampleUp'),
      label: 'up',
    },
    {
      element: document.querySelector('#btAddExampleRight'),
      label: 'right',
    },
    {
      element: document.querySelector('#btAddExampleNegative'),
      label: 'negative',
    },
  ];

  // para mostrar quantidade de exemplos inseridos no span da interface
  const totalExamplesAddedToTrain = {
    up: document.querySelector('#numberExamplesUp'),
    left: document.querySelector('#numberExamplesLeft'),
    right: document.querySelector('#numberExamplesRight'),
    down: document.querySelector('#numberExamplesDown'),
    negative: document.querySelector('#numberExamplesNegative'),
  };

  // botões para manipulação do modelo
  const btSaveModel = document.querySelector('#btSaveModel');
  const btLoadModel = document.querySelector('#btLoadModel');
  // input referente a inserção dos arquivos do modelo baixado (model.json)
  const modelDataFile = document.querySelector('#modelDataFile');

  // botões para iniciar classificação caso exista dados para treinamento
  const btStartClassification = document.querySelector(
    '#btStartClassification'
  );

  // botão para parar a classificação
  const btStopClassification = document.querySelector('#btStopClassification');

  // div de video para exibição da webcam
  const video = document.querySelector('#webcam');

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

  // variável usada para determinar se é para classificar ou
  // parar a classificação (quando botão correspondente a essa opção for acionado)
  let shouldClassify = false;

  // para permitir adicionar exemplo de classe, apenas quando o modelo MobileNet tiver sido carregado
  let mobileNetLoaded = false;

  // criando novo jogo
  const snakeGame = new SnakeGame(17, 24, 18, 230, {
    boardColor: '#ededed',
    snakeColor: '#573dff',
    foodColor: '#ff2626',
  });

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

      video.play();
      // exibindo video e card para inserir exemplos
      video.classList.remove('hide');
      insertNewExamplesArea.classList.remove('hide');
    } catch (error) {
      errorVideoIndicatorArea.classList.remove('hide');
      errorVideoIndicatorArea.innerHTML =
        "<img src='./assets/images/no-video.png' alt='No video icon' />" +
        "<p class='mt-3'>Não foi possível acessar a sua Webcam</p>";

      // desabilitar botões de iniciar e parar classificação
      btStartClassification.disabled = true;
      btStopClassification.disabled = true;

      console.error(error.message);
    }
  }

  // hiperparametros da classificação
  const MIN_THRESHOLD = 0.90;
  const K_NEAREST_NEIGHBORS = 11;

  // criar o modelo de classificação com KNN
  const knnModelClassifier = ml5.KNNClassifier();

  // Primeiro passo de transfer learning é extrair features já aprendidas do MobileNet
  const featureExtractor = ml5.featureExtractor('MobileNet', () => {
    console.log('Modelo carregado!');
    mobileNetLoaded = true;
  });

  const addNewTrainData = (label) => {
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

  // inserindo os eventos de inserir imagem para cada label (enquanto mouse estiver sobre botão,
  // um novo exemplo será adicionado a cada 100 ms)
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

    if (result.confidencesByLabel) {
      // obtendo porcentagem da classificação
      const confidences = result.confidencesByLabel;

      // result.label pode retornar um indice ou o nome da classe errado (quando insere-se novos exemplos) 
      // caso um modelo seja carregado, portanto, podemos pegar a label pelo confidenceByLabel
      // no codigo abaixo usa-se object.entries para retornar uma matriz com os pares key-value do objeto
      // find, vai obter o primeiro que satisfazer uma condição
      // [0], refere-se apenas a label, [1] pega a confiança
      const label = 
        Object.entries(confidences)
        .find(([, confidence]) => confidence >= MIN_THRESHOLD);

      // se alguma label for retornada
      if (label) {
        // ao reconhecer alguma classe, colocar a imagem especifica
        recognizedClassImage.src = `./assets/images/${label[0]}.png`;

        console.log(`Label: ${label[0]} - ${(label[1] * 100).toFixed(2)}%`);
        // controlando tecla
        controlArrowKeysBasedOnALabel(label[0]);
      }
    }
    // se usuário não tiver apertado em parar classificação, continuar em loop
    if (shouldClassify) classifyGesture();
  };

  const classifyGesture = () => {
    // obtendo as caracteristicas dos frames para classificação
    const features = featureExtractor.infer(video);
    // 10 é a quantidade de labels
    return knnModelClassifier.classify(features, K_NEAREST_NEIGHBORS, getLabelsReturnedFromModel);
  };

  btStartClassification.addEventListener('click', () => {
    // getNumLabels, retorna o número total de labels adicionados no modelo
    const qtdLabels = knnModelClassifier.getNumLabels();

    // se modelo customizado existe ou usuário colocou algum outro modelo, deve-se iniciar classificiação
    if (qtdLabels > 0) {
      // iniciar jogo
      gameArea.classList.remove('hide');
      snakeGame.restartGame();
      // para ficar em loop a classificação
      shouldClassify = true;
      // para mostrar os resultados da classificação com imagens e esconder a área referente a inserção de exemplos
      detectedGestureIndicatorArea.classList.remove('hide');
      insertNewExamplesArea.classList.add('hide');

      return classifyGesture();
    }

    // se chegou aqui é porque não existe modelo para ser usado.
    modelFeedbackIndicatorArea.classList.remove('hide');
    modelFeedbackIndicatorArea.innerText =
      'Adicione imagens de exemplos antes de iniciar a classificação';
  });

  btStopClassification.addEventListener('click', () => {
    // parar jogo
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

  // botão que abre janela para inserção de arquivos do modelo
  btLoadModel.addEventListener('click', () => {
    modelDataFile.click();
  });

  // falta carregar modelo
  modelDataFile.addEventListener('change', (e) => {
    modelFeedbackIndicatorArea.classList.remove('hide');
    try {
      // obtendo o arquivo
      const selectedFile = e.target.files[0];
      // criando uma url do arquivo selecionado
      const objectURL = URL.createObjectURL(selectedFile);
      // passando o arquivo .json para classificador carregar
      knnModelClassifier.load(objectURL, () => {
        const totalExamplesPerLabel = knnModelClassifier.getCountByLabel();

        knnModelClassifier.mapStringToIndex.forEach((label) => {
          // atualizando a quantidade de uma label especifica e exibindo na tela
          totalExamplesAddedToTrain[label].innerText = totalExamplesPerLabel[label];
        });
      });
    
      // informando que modelo foi carregado na interface
      modelFeedbackIndicatorArea.innerText = 'Modelo carregado com sucesso';
      
    } catch (error) {
      modelFeedbackIndicatorArea.innerText = 'Erro ao carregar o modelo';
      console.log(error);
    }
  });

  // obtendo apenas os botões, para incluir hover
  const btElements = btUsedToaddTrainData.map((btn) => btn.element);

  // Os Códigos abaixo incluem hover effects em todos os botões
  const listOfButtonsElementsToAddHover = [
    btSaveModel,
    btLoadModel,
    btStartClassification,
    btStopClassification,
    ...btElements,
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
