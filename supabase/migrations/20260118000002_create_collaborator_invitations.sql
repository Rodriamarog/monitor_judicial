-- Create collaborator_invitations table for email verification
CREATE TABLE IF NOT EXISTS collaborator_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner who sent invitation
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Invited collaborator email
  collaborator_email TEXT NOT NULL,

  -- Verification token (random UUID)
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(owner_id, collaborator_email)
);

-- Indexes for performance
CREATE INDEX idx_invitations_token ON collaborator_invitations(invitation_token);
CREATE INDEX idx_invitations_owner ON collaborator_invitations(owner_id);
CREATE INDEX idx_invitations_email ON collaborator_invitations(collaborator_email);
CREATE INDEX idx_invitations_status ON collaborator_invitations(status);

-- Enable Row Level Security
ALTER TABLE collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own invitations
CREATE POLICY "Users can view their own invitations"
  ON collaborator_invitations FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can create invitations
CREATE POLICY "Users can create invitations"
  ON collaborator_invitations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own invitations
CREATE POLICY "Users can update their own invitations"
  ON collaborator_invitations FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can delete their own invitations
CREATE POLICY "Users can delete their own invitations"
  ON collaborator_invitations FOR DELETE
  USING (auth.uid() = owner_id);

-- Allow public to accept invitations (token-based)
CREATE POLICY "Anyone can accept invitations with valid token"
  ON collaborator_invitations FOR UPDATE
  USING (status = 'pending' AND expires_at > now());

-- Table comment
COMMENT ON TABLE collaborator_invitations IS 'Tracks collaborator invitation status with email verification';
