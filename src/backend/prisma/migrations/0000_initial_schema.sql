-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create users table with security features
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_length CHECK (char_length(email) <= 255)
);

-- Create sessions table with relationship to users
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'expired', 'terminated')),
    metadata JSONB DEFAULT '{}'::jsonb,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_session_period CHECK (end_time IS NULL OR end_time > start_time)
);

-- Create conversations table with relationship to sessions
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'completed', 'error')),
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table with relationship to conversations
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'audio', 'both')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audio_recordings table with relationship to messages
CREATE TABLE audio_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID UNIQUE NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    storage_path VARCHAR(255) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('opus', 'pcm', 'aac', 'mp3')),
    duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create optimized indexes for common query patterns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status, start_time);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_status ON conversations(status, created_at);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_audio_recordings_message_id ON audio_recordings(message_id);

-- Enable row-level security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recordings ENABLE ROW LEVEL SECURITY;

-- Create row-level security policies
CREATE POLICY users_access ON users
    FOR ALL
    TO authenticated
    USING (id = current_user_id());

CREATE POLICY sessions_access ON sessions
    FOR ALL
    TO authenticated
    USING (user_id = current_user_id());

CREATE POLICY conversations_access ON conversations
    FOR ALL
    TO authenticated
    USING (session_id IN (
        SELECT id FROM sessions WHERE user_id = current_user_id()
    ));

CREATE POLICY messages_access ON messages
    FOR ALL
    TO authenticated
    USING (conversation_id IN (
        SELECT id FROM conversations WHERE session_id IN (
            SELECT id FROM sessions WHERE user_id = current_user_id()
        )
    ));

CREATE POLICY audio_recordings_access ON audio_recordings
    FOR ALL
    TO authenticated
    USING (message_id IN (
        SELECT id FROM messages WHERE conversation_id IN (
            SELECT id FROM conversations WHERE session_id IN (
                SELECT id FROM sessions WHERE user_id = current_user_id()
            )
        )
    ));

-- Create audit logging triggers
CREATE OR REPLACE FUNCTION audit_log() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), current_user_id());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), current_user_id());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), current_user_id());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply audit triggers to all tables
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_log();

CREATE TRIGGER audit_sessions
    AFTER INSERT OR UPDATE OR DELETE ON sessions
    FOR EACH ROW EXECUTE FUNCTION audit_log();

CREATE TRIGGER audit_conversations
    AFTER INSERT OR UPDATE OR DELETE ON conversations
    FOR EACH ROW EXECUTE FUNCTION audit_log();

CREATE TRIGGER audit_messages
    AFTER INSERT OR UPDATE OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION audit_log();

CREATE TRIGGER audit_audio_recordings
    AFTER INSERT OR UPDATE OR DELETE ON audio_recordings
    FOR EACH ROW EXECUTE FUNCTION audit_log();

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;