package secrets

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/kms"
	"github.com/aws/aws-sdk-go-v2/service/kms/types"
)

// KMSKEK wraps data keys with an AWS KMS symmetric key.
type KMSKEK struct {
	client *kms.Client
	keyID  string
}

func NewKMSKEK(ctx context.Context, keyID string) (*KMSKEK, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &KMSKEK{client: kms.NewFromConfig(cfg), keyID: keyID}, nil
}

func (k *KMSKEK) GenerateDataKey(ctx context.Context) ([]byte, []byte, error) {
	out, err := k.client.GenerateDataKey(ctx, &kms.GenerateDataKeyInput{KeyId: aws.String(k.keyID), KeySpec: types.DataKeySpecAes256})
	if err != nil {
		return nil, nil, err
	}
	return out.Plaintext, out.CiphertextBlob, nil
}

func (k *KMSKEK) Decrypt(ctx context.Context, wrapped []byte) ([]byte, error) {
	out, err := k.client.Decrypt(ctx, &kms.DecryptInput{CiphertextBlob: wrapped, KeyId: aws.String(k.keyID)})
	if err != nil {
		return nil, err
	}
	return out.Plaintext, nil
}

// FromConfig picks KMS when a key ID is set, otherwise the local KEK.
func FromConfig(ctx context.Context, kmsKeyID, localKEK string) (KEK, error) {
	if kmsKeyID != "" {
		return NewKMSKEK(ctx, kmsKeyID)
	}
	return NewLocalKEK(localKEK)
}
