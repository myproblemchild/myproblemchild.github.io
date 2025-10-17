pub struct FenwickTree {
    size: usize,
    t: Vec<u32>,
}

impl FenwickTree {
    pub fn new(n: usize) -> FenwickTree {
        FenwickTree {
            size: n,
            t: vec![0; n as usize],
        }
    }

    pub fn sum(&self, mut range: i32) -> u32 {
        let mut res: u32 = 0;
        while range >= 0 {
            res += self.t[range as usize];
            range = (range & (range + 1)) - 1;
        }
        res
    }

    pub fn inc(&mut self, mut i: usize) {
        while i < self.size {
            self.t[i] += 1;
            i = i | (i + 1);
        }
    }

    pub fn dec(&mut self, mut i: usize) {
        while i < self.size {
            self.t[i] -= 1;
            i = i | (i + 1);
        }
    }

    pub fn sum_range(&self, l: i32, r: i32) -> u32 {
        self.sum(r) - self.sum(l - 1)
    }
}
