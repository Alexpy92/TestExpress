const request = require('supertest');
const app = require('./app');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const externalService = require('./externalService');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({});
    const uri = await mongoServer.getUri();
    await mongoose.connect(uri, {
        driverInfo: { name: 'nodejs', version: '6.0.0' }
    });
}, 50000);

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) { await mongoServer.stop(); }
}, 50000);

describe('GET /api/hello', () => {
    test('deberia retornar "Hello, World!" cuando no se proporciona un nombre', async () => {
    });

    test(`deberia retornar "Hello, Juan" cuando se proporciona un nombre`, async () => {
        const name = 'Juan';
        const res = await request(app).get(`/api/hello?name=Juan`)
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: `Hello ${name}` });
        })
});

test('GET /api/hello deberia de retornar un mensaje', async () => {
    const res = await request(app).get('/api/hello');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Hello World' });
});

describe('POST /api/echo', () => {
    test('deberia retornar el mismo mensaje que se envio', async () => {
        const res = await request(app)
            .post('/api/echo')
            .send({ message: 'Hello World' });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'Hello World' });
    })

    test('deberia de retornar un mensaje 400 si no se envia un mensaje', async () => {
        const res = await request(app)
            .post('/api/echo')
            .send({});
            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({ error: 'Escriba un mensaje' });
    });
});

describe('POST /api/users', () => {
    test('deberia crear un nuevo usuario', async () => {
        const res = await request(app)
        .post('/api/users')
        .send({ name: 'Alex', email: 'alex@example.com' });
        expect(res.statusCode).toBe(201);
        expect(res.body).toMatchObject({ name: 'Alex', email: 'alex@example.com' });
        expect(res.body).toHaveProperty('_id');
    });

    test('deberia retornar un error 400 si el nombre es menor a 3 caracteres', async () => {
        const res = await request(app)
        .post('/api/users')
        .send({ name: 'Al', email: 'alex@example.com' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('Listar usuarios', async () => {
        const res = await request(app)
        .post('/api/users')
        .send({ name: 'Alex', email: 'alex@example.com' });

        const listRes = await request(app).get('/api/users');
        expect(listRes.statusCode).toBe(200);
        expect(Array.isArray(listRes.body)).toBe(true);
        expect(listRes.body.length).toBe(1);
    });
});

describe('GET /api/external (Mocking)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Exito simulado', async () => {
        jest.spyOn(externalService, 'fetchExternalData').mockResolvedValue({ data: 'mocked data' });
        const res = await request(app).get('/api/external');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ data: 'mocked data' });
    });

    test('Error simulado', async () => {
        jest.spyOn(externalService, 'fetchExternalData').mockRejectedValue(new Error('Fallo en el servicio externo'));
        const res = await request(app).get('/api/external');
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ error: 'Fallo en el servicio externo' });
    });
});

describe('GET /api/profile (Autenticacion)', () => {

    test('deberia retornar un error 401 si no se proporciona un token', async () => {
        const res = await request(app).get('/api/profile');
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({ error: 'Token Requerido' });
    });

    test('deberia retornar un error 403 si se proporciona un token invalido', async () => {
        const res = await request(app).get('/api/profile')
        .set('Authorization', 'Bearer token-falso');
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({ error: 'Token Inválido' });
    });

    test('deberia retornar el perfil del usuario si se proporciona un token valido', async () => {
        const res = await request(app).get('/api/profile')
        .set('Authorization', 'Bearer mi-token-secreto');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ user: 'Alex', role: 'admin' });
    });
});

describe('GET /api/greeting', () => {

    test('deberia retornar un saludo generico si no se proporciona un nombre', async () => {
        const res = await request(app).get('/api/greeting');
        expect(res.statusCode).toBe(200);
        expect(res.type).toBe('text/plain');
        expect(res.text).toBe('Hello, World!');
    });

    test('deberia retornar un saludo con el nombre proporcionado', async () => {
        const name = 'Alex';
        const res = await request(app).get(`/api/greeting?name=${name}`);
        expect(res.statusCode).toBe(200);
        expect(res.type).toBe('text/plain');
        expect(res.text).toBe(`Hello, ${name}!`);
    });
});

describe('PUT /api/users/:id', (TDD) => {
    test('deberia actualizar un usuario existente', async () => {
        const createRes = await request(app)
            .post('/api/users')
            .send({ name: 'Alex', email: 'alex@example.com' });
        const userId = createRes.body._id;

        const res = await request(app)
            .put(`/api/users/${userId}`)
            .send({ name: 'Alex Updated', email: 'alex.updated@example.com' });
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe('Alex Updated');
        expect(res.body.email).toBe('alex.updated@example.com');
    });
});
