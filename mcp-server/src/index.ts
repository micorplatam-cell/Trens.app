#!/usr/bin/env node
/**
 * ============================================================================
 * TRENS MCP SERVER 🔥
 * Model Context Protocol Server para acceso DIRECTO a:
 * - Supabase (Base de datos)
 * - Análisis del proyecto
 * - Git operations
 * - Spotify metadata
 * ============================================================================
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '../.env' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ============================================================================
// SERVER SETUP
// ============================================================================

const server = new Server(
  {
    name: 'trens-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================================================
// TOOLS - Acciones que Copilot puede ejecutar
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // DATABASE TOOLS
      {
        name: 'db_query',
        description: 'Ejecutar una consulta SELECT en Supabase. Solo lectura.',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Nombre de la tabla' },
            select: { type: 'string', description: 'Columnas a seleccionar (default: *)' },
            filter: { type: 'string', description: 'Filtro en formato column=value' },
            limit: { type: 'number', description: 'Límite de resultados (default: 10)' },
          },
          required: ['table'],
        },
      },
      {
        name: 'db_insert',
        description: 'Insertar un registro en Supabase',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Nombre de la tabla' },
            data: { type: 'object', description: 'Datos a insertar' },
          },
          required: ['table', 'data'],
        },
      },
      {
        name: 'db_update',
        description: 'Actualizar registros en Supabase',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Nombre de la tabla' },
            data: { type: 'object', description: 'Datos a actualizar' },
            match: { type: 'object', description: 'Condición para match (ej: {id: "xxx"})' },
          },
          required: ['table', 'data', 'match'],
        },
      },
      {
        name: 'db_delete',
        description: 'Eliminar registros en Supabase',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Nombre de la tabla' },
            match: { type: 'object', description: 'Condición para match (ej: {id: "xxx"})' },
          },
          required: ['table', 'match'],
        },
      },
      {
        name: 'db_rpc',
        description: 'Ejecutar una función RPC de Supabase',
        inputSchema: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: 'Nombre de la función' },
            params: { type: 'object', description: 'Parámetros de la función' },
          },
          required: ['function_name'],
        },
      },
      {
        name: 'db_tables',
        description: 'Listar todas las tablas de la base de datos',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // GIT TOOLS
      {
        name: 'git_status',
        description: 'Ver estado de git (archivos modificados, branch, etc)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'git_commit',
        description: 'Crear un commit con todos los cambios',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Mensaje del commit' },
          },
          required: ['message'],
        },
      },
      {
        name: 'git_push',
        description: 'Push al remote',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'git_log',
        description: 'Ver últimos commits',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Número de commits (default: 10)' },
          },
        },
      },
      // PROJECT TOOLS
      {
        name: 'project_analyze',
        description: 'Analizar estructura del proyecto TRENS',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'find_component',
        description: 'Buscar un componente por nombre',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nombre del componente' },
          },
          required: ['name'],
        },
      },
      {
        name: 'run_command',
        description: 'Ejecutar un comando de terminal',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Comando a ejecutar' },
          },
          required: ['command'],
        },
      },
    ],
  };
});

// ============================================================================
// TOOL HANDLERS
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ====== DATABASE TOOLS ======
      case 'db_query': {
        if (!supabase) throw new Error('Supabase no configurado');
        const { table, select = '*', filter, limit = 10 } = args as any;

        let query: any = supabase.from(table).select(select).limit(limit);

        if (filter) {
          const [col, val] = filter.split('=');
          query = query.eq(col.trim(), val.trim());
        }

        const { data, error } = await query;
        if (error) throw error;

        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'db_insert': {
        if (!supabase) throw new Error('Supabase no configurado');
        const { table, data } = args as any;

        const { data: result, error } = await supabase.from(table).insert(data).select();
        if (error) throw error;

        return { content: [{ type: 'text', text: `✅ Insertado: ${JSON.stringify(result)}` }] };
      }

      case 'db_update': {
        if (!supabase) throw new Error('Supabase no configurado');
        const { table, data, match } = args as any;

        let query = supabase.from(table).update(data);
        Object.entries(match).forEach(([key, value]) => {
          query = query.eq(key, value as any);
        });

        const { data: result, error } = await query.select();
        if (error) throw error;

        return { content: [{ type: 'text', text: `✅ Actualizado: ${JSON.stringify(result)}` }] };
      }

      case 'db_delete': {
        if (!supabase) throw new Error('Supabase no configurado');
        const { table, match } = args as any;

        let query = supabase.from(table).delete();
        Object.entries(match).forEach(([key, value]) => {
          query = query.eq(key, value as any);
        });

        const { error } = await query;
        if (error) throw error;

        return { content: [{ type: 'text', text: `✅ Eliminado de ${table}` }] };
      }

      case 'db_rpc': {
        if (!supabase) throw new Error('Supabase no configurado');
        const { function_name, params = {} } = args as any;

        const { data, error } = await supabase.rpc(function_name, params);
        if (error) throw error;

        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'db_tables': {
        if (!supabase) throw new Error('Supabase no configurado');

        const { data, error } = await supabase.rpc('get_tables');
        if (error) {
          // Fallback: listar tablas conocidas
          return {
            content: [
              {
                type: 'text',
                text: 'Tablas conocidas: profiles, exercises, user_exercise_configs, user_assets, asset_templates, workout_sessions, meal_plans, daily_meals',
              },
            ],
          };
        }

        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      // ====== GIT TOOLS ======
      case 'git_status': {
        const status = execSync('git status --porcelain', { encoding: 'utf-8' });
        const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

        return {
          content: [
            { type: 'text', text: `Branch: ${branch}\n\nCambios:\n${status || 'Ninguno'}` },
          ],
        };
      }

      case 'git_commit': {
        const { message } = args as any;
        execSync('git add -A', { encoding: 'utf-8' });
        const result = execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });

        return { content: [{ type: 'text', text: `✅ Commit creado: ${message}\n\n${result}` }] };
      }

      case 'git_push': {
        const result = execSync('git push', { encoding: 'utf-8' });
        return { content: [{ type: 'text', text: `✅ Push completado\n\n${result}` }] };
      }

      case 'git_log': {
        const { count = 10 } = args as any;
        const log = execSync(`git log --oneline -${count}`, { encoding: 'utf-8' });

        return { content: [{ type: 'text', text: log }] };
      }

      // ====== PROJECT TOOLS ======
      case 'project_analyze': {
        const projectRoot = process.cwd().replace('/mcp-server', '');

        const countFiles = (dir: string, ext: string): number => {
          try {
            const files = execSync(
              `find ${dir} -name "*.${ext}" 2>/dev/null | grep -v node_modules | wc -l`,
              { encoding: 'utf-8' }
            );
            return parseInt(files.trim()) || 0;
          } catch {
            return 0;
          }
        };

        const analysis = {
          components: countFiles('components', 'tsx'),
          screens: countFiles('app', 'tsx'),
          services: countFiles('services', 'ts'),
          hooks: countFiles('hooks', 'ts'),
          totalLines: execSync(
            `find . \\( -name "*.tsx" -o -name "*.ts" \\) | grep -v node_modules | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}'`,
            { encoding: 'utf-8' }
          ).trim(),
        };

        return { content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }] };
      }

      case 'find_component': {
        const { name } = args as any;
        const result = execSync(
          `find . -name "*${name}*" -type f \\( -name "*.tsx" -o -name "*.ts" \\) | grep -v node_modules | head -10`,
          { encoding: 'utf-8' }
        );

        return { content: [{ type: 'text', text: result || 'No encontrado' }] };
      }

      case 'run_command': {
        const { command } = args as any;
        const result = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

        return { content: [{ type: 'text', text: result }] };
      }

      default:
        throw new Error(`Tool desconocido: ${name}`);
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
  }
});

// ============================================================================
// RESOURCES - Datos que Copilot puede leer
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'trens://schema',
        name: 'TRENS Database Schema',
        description: 'Esquema de la base de datos de TRENS',
        mimeType: 'application/json',
      },
      {
        uri: 'trens://project-structure',
        name: 'Project Structure',
        description: 'Estructura de archivos del proyecto',
        mimeType: 'text/plain',
      },
      {
        uri: 'trens://env-status',
        name: 'Environment Status',
        description: 'Estado de las variables de entorno',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'trens://schema': {
      const schema = {
        tables: [
          'profiles',
          'exercises',
          'user_exercise_configs',
          'user_assets',
          'asset_templates',
          'workout_sessions',
          'meal_plans',
          'daily_meals',
        ],
        description: 'Base de datos de TRENS fitness app',
      };
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(schema, null, 2) }],
      };
    }

    case 'trens://project-structure': {
      const structure = execSync(
        'find . -type f \\( -name "*.tsx" -o -name "*.ts" \\) | grep -v node_modules | sort',
        { encoding: 'utf-8' }
      );
      return { contents: [{ uri, mimeType: 'text/plain', text: structure }] };
    }

    case 'trens://env-status': {
      const status = {
        supabase: !!SUPABASE_URL,
        gemini: !!process.env.EXPO_PUBLIC_GEMINI_API_KEY,
        cloudflare: !!process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
        expo: !!process.env.EXPO_TOKEN,
      };
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(status, null, 2) }],
      };
    }

    default:
      throw new Error(`Resource desconocido: ${uri}`);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🔥 TRENS MCP Server running');
}

main().catch(console.error);
