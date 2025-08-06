#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function createDefaultCategories() {
  console.log('Criando categorias padrão para produtos odontológicos...');

  const defaultCategories = [
    {
      name: 'Materiais Restauradores',
      description: 'Resinas compostas, amálgama, cimento de ionômero de vidro'
    },
    {
      name: 'Materiais de Moldagem',
      description: 'Alginatos, siliconas, moldeiras, gesso'
    },
    {
      name: 'Anestésicos',
      description: 'Anestésicos locais, agulhas, seringas carpule'
    },
    {
      name: 'Endodontia',
      description: 'Limas, irrigantes, medicamentos, obturadores'
    },
    {
      name: 'Periodontia',
      description: 'Curetas, instrumentos periodontais, membranas'
    },
    {
      name: 'Cirurgia',
      description: 'Fórceps, elevadores, suturas, bisturis'
    },
    {
      name: 'Prótese',
      description: 'Materiais para prótese, articuladores, ceras'
    },
    {
      name: 'Ortodontia',
      description: 'Brackets, fios ortodônticos, elásticos'
    },
    {
      name: 'Prevenção',
      description: 'Flúor, selantes, materiais preventivos'
    },
    {
      name: 'Descartáveis',
      description: 'Luvas, máscaras, aventais, sugadores'
    },
    {
      name: 'Esterilização',
      description: 'Produtos para limpeza e esterilização'
    },
    {
      name: 'Equipamentos',
      description: 'Peças de mão, contra-ângulos, equipamentos diversos'
    }
  ];

  try {
    // Get all companies to create categories for each one
    const companies = await sql`SELECT id, name FROM companies`;
    console.log(`Encontradas ${companies.length} empresas`);

    for (const company of companies) {
      console.log(`Criando categorias para empresa: ${company.name} (ID: ${company.id})`);
      
      for (const category of defaultCategories) {
        // Check if category already exists
        const existing = await sql`
          SELECT id FROM product_categories 
          WHERE company_id = ${company.id} AND name = ${category.name}
        `;

        if (existing.length === 0) {
          await sql`
            INSERT INTO product_categories (company_id, name, description, is_active, created_by)
            VALUES (${company.id}, ${category.name}, ${category.description}, true, 1)
          `;
          console.log(`  ✓ ${category.name}`);
        } else {
          console.log(`  - ${category.name} (já existe)`);
        }
      }
    }

    console.log('Categorias padrão criadas com sucesso!');

  } catch (error) {
    console.error('Erro ao criar categorias padrão:', error);
    process.exit(1);
  }
}

createDefaultCategories();