const express = require("express");
const { v4: uuidv4 } = require("uuid");
const app = express();

app.use(express.json());
const customers = [];

function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  // procura o extrato por cpf
  const customer = customers.find((customer) => customer.cpf === cpf);
  
  //Não deve ser possivel buscar contrato de cpf inexistente
  if(!customer){
    return response.status(400).json({error: "Customer not found"});
  }

  request.customer = customer;

  return next();

}

// caso for debito ele tira o valor incluso do amount
function getBalance(statement) {
 const balance =  statement.reduce((acc, operation) => {
    if(operation.type === 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

/**
 * cpf - string
 * name - string
 * id - uuid
 * statement []
 */
app.post("/account", (request, response) => {
  const {cpf, name } = request.body;

  const customerAlreadyExistis = customers.some(
    (customer) => customer.cpf === cpf
  );

  if(customerAlreadyExistis){
    return response.status(400).json({error: "Customer already exists!"});
  }

  //chamada de função uuidv4
  // const id = uuidv4();

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  });

  return response.status(201).send();
});

// se todas rotas estiverem o mesmo MIDDLEWARES
// app.use(verifyIfExistsAccountCPF);

app.get("/statement",  verifyIfExistsAccountCPF, (request, response) => {
  // desestruturação do customer dentro do request
  const { customer } = request;

  return response.json(customer.statement);


});

app.post("/deposit",  verifyIfExistsAccountCPF, (request, response) => {
  // desestruturação do customer dentro do request
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description, 
    amount,
    created_at: new Date(),
    type: "credit"
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw",  verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;

  const { customer } = request;

  const balance = getBalance(customer.statement);

  if(balance < amount){
    return response.status(400).json({error: "Insuffcient funds!"})
  }

  const statementOperation = { 
    amount,
    created_at: new Date(),
    type: "debit"
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

// filtra por data o extrato
app.get("/statement/date",  verifyIfExistsAccountCPF, (request, response) => {
  // desestruturação do customer dentro do request
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) => 
     statement.created_at.toDateString() === 
     new Date(dateFormat).toDateString()
    );

  return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.listen(3333);