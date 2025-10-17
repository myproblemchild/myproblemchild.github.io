use std::{
    collections::{BTreeMap, BTreeSet},
    io,
    time::Instant,
};

use crate::fw::FenwickTree;

mod fw;

const GRID_SIZE: u32 = 1000;

fn on(v: &mut bool) {
    *v = true;
}

fn off(v: &mut bool) {
    *v = false;
}

fn toggle(v: &mut bool) {
    *v = !*v;
}

fn parse(pair: &str, k: u32) -> (u32, u32) {
    let parts: Vec<&str> = pair.split(",").collect();
    (
        String::from(parts[0].trim()).parse::<u32>().unwrap() * k,
        String::from(parts[1].trim()).parse::<u32>().unwrap() * k,
    )
}

#[derive(Debug, Clone)]
enum Operation {
    On,
    Off,
    Toggle,
}

#[derive(Debug)]
struct Event {
    is_open: bool,
    operation: Operation,
    z_index: i32,
}

fn run_naive(k: u32) {
    let mut lights: Vec<Vec<bool>> = Vec::with_capacity((k * GRID_SIZE) as usize);
    for _ in 0..(k * GRID_SIZE) {
        lights.push(vec![false; (k * GRID_SIZE) as usize]);
    }
    let mut buffer = String::new();
    loop {
        let read_line_res = io::stdin().read_line(&mut buffer);
        if read_line_res.unwrap_or(0) == 0 {
            break;
        }

        let parts: Vec<&str> = buffer.split(" ").collect();
        let (op, pair1, pair2): (fn(&mut bool), _, _) = match (parts[0], parts[1], parts[2]) {
            (_, "on", _) => (on, parts[2], parts[4]),
            (_, "off", _) => (off, parts[2], parts[4]),
            ("toggle", _, _) => (toggle, parts[1], parts[3]),
            _ => {
                // must not happen.
                return;
            }
        };

        let coords1 = parse(pair1, k);
        let coords2 = parse(pair2, k);
        for row in coords1.0.min(coords2.0)..=coords1.0.max(coords2.0) {
            for col in coords1.1.min(coords2.1)..=coords1.1.max(coords2.1) {
                op(&mut lights[row as usize][col as usize]);
            }
        }

        buffer.clear();
    }

    let mut res = 0;
    for row in lights.iter() {
        for col in row {
            if *col {
                res += 1;
            }
        }
    }
    println!("{}", res);
}

fn add_to_array(
    events_by_coord: &mut BTreeMap<u32, Vec<Event>>,
    coord: u32,
    is_open: bool,
    operation: &Operation,
    z_index: i32,
) {
    events_by_coord
        .entry(coord)
        .or_insert_with(Vec::new)
        .push(Event {
            is_open,
            operation: (*operation).clone(),
            z_index,
        });
}

fn add_rectangle(
    coords1: &(u32, u32),
    coords2: &(u32, u32),
    events_by_x_coord: &mut BTreeMap<u32, Vec<Event>>,
    events_by_y_coord: &mut BTreeMap<u32, Vec<Event>>,
    z_index: i32,
    operation: &Operation,
) {
    let left_x = coords1.0.min(coords2.0);
    let right_x = coords1.0.max(coords2.0);
    let bottom_y = coords1.1.min(coords2.1);
    let top_y = coords1.1.max(coords2.1);
    add_to_array(events_by_x_coord, left_x, true, operation, z_index);
    add_to_array(events_by_x_coord, right_x + 1, false, operation, z_index);
    add_to_array(events_by_y_coord, bottom_y, true, operation, z_index);
    add_to_array(events_by_y_coord, top_y + 1, false, operation, z_index);
}

fn process_patch(
    left: u32,
    right: u32,
    bottom: u32,
    top: u32,
    turn_on: &BTreeSet<i32>,
    turn_off: &BTreeSet<i32>,
    fw_toggle_active: &FenwickTree,
    total_rectangles: i32,
) -> u32 {
    let mut base_val = false;
    let mut last_turn: i32 = *turn_off.last().unwrap_or(&-1);
    if let Some(turn_on_last) = turn_on.last() {
        if *turn_on_last > last_turn {
            last_turn = *turn_on_last;
            base_val = true;
        }
    }

    let toggles_after_last_turn = fw_toggle_active.sum_range(last_turn + 1, total_rectangles - 1);
    if toggles_after_last_turn % 2 == 1 {
        base_val = !base_val;
    }

    if base_val {
        let h = (right - left) as u32;
        let v = (top - bottom) as u32;
        h * v
    } else {
        0
    }
}

fn process_vertical_stripe(
    x_prev_val: u32,
    x: u32,
    active_set_within_vertical_stripe: &BTreeSet<i32>,
    events_by_y_coord: &BTreeMap<u32, Vec<Event>>,
    total_rectangles: i32,
) -> u32 {
    let mut res: u32 = 0;

    let mut active_set_within_horizontal_stripe: BTreeSet<i32> = BTreeSet::new();
    let mut active_on_within_horizontal_stripe: BTreeSet<i32> = BTreeSet::new();
    let mut active_off_within_horizontal_stripe: BTreeSet<i32> = BTreeSet::new();
    let mut active_toggle_within_horizontal_stripe: BTreeSet<i32> = BTreeSet::new();
    let mut fw_toggle = FenwickTree::new(total_rectangles as usize);

    let mut y_prev: Option<u32> = None;

    for p in events_by_y_coord.iter() {
        let y = p.0;
        if let Some(y_prev_val) = y_prev {
            if !active_set_within_horizontal_stripe.is_empty() {
                res += process_patch(
                    x_prev_val,
                    x,
                    y_prev_val,
                    *y,
                    &active_on_within_horizontal_stripe,
                    &active_off_within_horizontal_stripe,
                    &fw_toggle,
                    total_rectangles,
                );
            }
        }

        y_prev = Some(*y);

        for e in p.1.iter() {
            if !active_set_within_vertical_stripe.contains(&e.z_index) {
                continue;
            }

            match e.is_open {
                true => {
                    active_set_within_horizontal_stripe.insert(e.z_index);
                    match e.operation {
                        Operation::On => {
                            active_on_within_horizontal_stripe.insert(e.z_index);
                        }
                        Operation::Off => {
                            active_off_within_horizontal_stripe.insert(e.z_index);
                        }
                        Operation::Toggle => {
                            active_toggle_within_horizontal_stripe.insert(e.z_index);
                            fw_toggle.inc(e.z_index as usize);
                        }
                    }
                }
                false => {
                    active_set_within_horizontal_stripe.remove(&e.z_index);
                    match e.operation {
                        Operation::On => {
                            active_on_within_horizontal_stripe.remove(&e.z_index);
                        }
                        Operation::Off => {
                            active_off_within_horizontal_stripe.remove(&e.z_index);
                        }
                        Operation::Toggle => {
                            active_toggle_within_horizontal_stripe.remove(&e.z_index);
                            fw_toggle.dec(e.z_index as usize);
                        }
                    }
                }
            }
        }
    }

    res
}

fn run_optimized(k: u32) {
    let mut events_by_x_coord: BTreeMap<u32, Vec<Event>> = BTreeMap::new();
    let mut events_by_y_coord: BTreeMap<u32, Vec<Event>> = BTreeMap::new();
    let mut z_index: i32 = 0;

    let mut buffer = String::new();
    loop {
        let read_line_res = io::stdin().read_line(&mut buffer);
        if read_line_res.unwrap_or(0) == 0 {
            break;
        }

        let parts: Vec<&str> = buffer.split(" ").collect();
        let (op, pair1, pair2): (_, _, _) = match (parts[0], parts[1], parts[2]) {
            (_, "on", _) => (Operation::On, parts[2], parts[4]),
            (_, "off", _) => (Operation::Off, parts[2], parts[4]),
            ("toggle", _, _) => (Operation::Toggle, parts[1], parts[3]),
            _ => {
                // must not happen.
                return;
            }
        };

        let coords1 = parse(pair1, k);
        let coords2 = parse(pair2, k);
        add_rectangle(
            &coords1,
            &coords2,
            &mut events_by_x_coord,
            &mut events_by_y_coord,
            z_index,
            &op,
        );

        buffer.clear();
        z_index += 1;
    }

    let mut active_set_within_vertical_stripe: BTreeSet<i32> = BTreeSet::new();
    let mut x_prev: Option<u32> = None;
    let mut res: u32 = 0;
    for pair in events_by_x_coord.iter() {
        let x = pair.0;
        if let Some(x_prev_value) = x_prev {
            res += process_vertical_stripe(
                x_prev_value,
                *x,
                &active_set_within_vertical_stripe,
                &events_by_y_coord,
                z_index,
            );
        }
        for e in pair.1 {
            if e.is_open {
                active_set_within_vertical_stripe.insert(e.z_index);
            } else {
                active_set_within_vertical_stripe.remove(&e.z_index);
            }

            x_prev = Some(*pair.0);
        }
    }

    println!("{}", res);
}

fn main() {
    let start = Instant::now();
    let k = std::env::args()
        .nth(1)
        .expect("provide k, 1 for default")
        .parse::<u32>()
        .unwrap();

    let mode = std::env::args()
        .nth(2)
        .expect("provide mode: NAIVE or OPTIMIZED");
    match mode.to_ascii_lowercase().as_str() {
        "naive" => {
            run_naive(k);
        }
        "optimized" => {
            run_optimized(k);
        }
        _ => {
            assert!(
                false,
                "--mode must be provided and must be NAIVE or OPTIMIZED"
            );
        }
    }
    println!(
        "Time: {} ms",
        Instant::now().duration_since(start).as_millis()
    );
}
