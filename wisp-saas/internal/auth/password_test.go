package auth

import "testing"

func TestPasswordHashing(t *testing.T) {
	h, err := HashPassword("correct horse")
	if err != nil {
		t.Fatal(err)
	}
	if ok, _ := CheckPassword(h, "correct horse"); !ok {
		t.Fatal("right password rejected")
	}
	if ok, _ := CheckPassword(h, "wrong"); ok {
		t.Fatal("wrong password accepted")
	}
	h2, _ := HashPassword("correct horse")
	if h == h2 {
		t.Fatal("hashes should be salted")
	}
	if _, err := CheckPassword("garbage", "x"); err == nil {
		t.Fatal("expected error for malformed hash")
	}
}
